using Estoque.Application.Contracts;
using Estoque.Application.Interfaces;
using Estoque.Domain.Exceptions;
using Estoque.Domain.Interfaces;
using Estoque.Infrastructure.Persistence;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Estoque.Infrastructure.Consumers;

public class NotaFiscalEmitidaConsumer : IConsumer<NotaFiscalEmitidaEvent>
{
    private readonly IProdutoRepository _produtoRepository;
    private readonly EstoqueDbContext _context;
    private readonly IIdempotencyService _idempotencyService;
    private readonly IDistributedLockService _distributedLockService;
    private readonly IProdutoCacheService _cacheService;
    private readonly ILogger<NotaFiscalEmitidaConsumer> _logger;

    public NotaFiscalEmitidaConsumer(
        IProdutoRepository produtoRepository,
        EstoqueDbContext context,
        IIdempotencyService idempotencyService,
        IDistributedLockService distributedLockService,
        IProdutoCacheService cacheService,
        ILogger<NotaFiscalEmitidaConsumer> logger)
    {
        _produtoRepository = produtoRepository ?? throw new ArgumentNullException(nameof(produtoRepository));
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _idempotencyService = idempotencyService ?? throw new ArgumentNullException(nameof(idempotencyService));
        _distributedLockService = distributedLockService ?? throw new ArgumentNullException(nameof(distributedLockService));
        _cacheService = cacheService;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task Consume(ConsumeContext<NotaFiscalEmitidaEvent> context)
    {
        var message = context.Message;
        var idempotencyKey = message.NotaFiscalId.ToString();
        var correlationId = context.CorrelationId?.ToString() ?? message.NotaFiscalId.ToString();

        using (_logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            _logger.LogInformation("Recebido evento NotaFiscalEmitidaEvent para Nota Fiscal {NotaFiscalId} com CorrelationId {CorrelationId}.", message.NotaFiscalId, correlationId);

        // 1. Verificação de Idempotência
        if (await _idempotencyService.RequestExistsAsync(idempotencyKey, context.CancellationToken))
        {
            _logger.LogWarning("Evento NotaFiscalEmitidaEvent {NotaFiscalId} já foi processado anteriormente. Ignorando duplicata.", message.NotaFiscalId);
            return;
        }

        var locks = new List<IDisposable>();

        try
        {
            // 2. Aquisição de Trava Distribuída (Redlock) em chaves DISTINTAS e ordenadas
            var chavesDistintas = message.Itens
                .Select(i => i.CodigoProduto.Trim().ToUpperInvariant())
                .Distinct()
                .OrderBy(c => c)
                .ToList();

            foreach (var codigoKey in chavesDistintas)
            {
                var resourceKey = $"produto:{codigoKey}";
                var lockObj = await _distributedLockService.AcquireLockAsync(resourceKey, TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(15), context.CancellationToken);

                if (lockObj == null)
                {
                    throw new InvalidOperationException($"Não foi possível adquirir a trava distribuída para o produto '{codigoKey}'.");
                }

                locks.Add(lockObj);
            }

            // 3. Validação e Processamento Atômico com Transação do Banco de Dados (Agrupado por produto)
            var itensAgrupados = message.Itens
                .GroupBy(i => i.CodigoProduto.Trim().ToUpperInvariant())
                .Select(g => new { CodigoKey = g.Key, OriginalCodigo = g.First().CodigoProduto, QuantidadeTotal = g.Sum(x => x.Quantidade) })
                .ToList();

            var erros = new List<string>();
            var produtosParaDebitar = new List<(Estoque.Domain.Entities.Produto Produto, int QuantidadeTotal, string OriginalCodigo)>();

            foreach (var item in itensAgrupados)
            {
                var produto = await _produtoRepository.GetByCodigoAsync(item.OriginalCodigo, context.CancellationToken);
                if (produto == null)
                {
                    erros.Add($"Item '{item.OriginalCodigo}': produto não encontrado no estoque.");
                }
                else if (produto.Saldo < item.QuantidadeTotal)
                {
                    erros.Add($"Item '{item.OriginalCodigo}': saldo insuficiente (solicitado: {item.QuantidadeTotal}, disponível: {produto.Saldo}).");
                }
                else
                {
                    produtosParaDebitar.Add((produto, item.QuantidadeTotal, item.OriginalCodigo));
                }
            }

            if (erros.Count > 0)
            {
                var motivoCompleto = $"Falha no estoque ({erros.Count} erro(s)): " + string.Join(" | ", erros);
                throw new DomainException(motivoCompleto);
            }

            await using var transaction = await _context.Database.BeginTransactionAsync(context.CancellationToken);

            foreach (var item in produtosParaDebitar)
            {
                item.Produto.DebitarSaldo(item.QuantidadeTotal);
                _produtoRepository.Update(item.Produto);
            }

            await _produtoRepository.SaveChangesAsync(context.CancellationToken);
            await transaction.CommitAsync(context.CancellationToken);

            // Atualiza o saldo no Redis Cache
            if (_cacheService != null)
            {
                foreach (var item in itensAgrupados)
                {
                    var p = await _produtoRepository.GetByCodigoAsync(item.OriginalCodigo, context.CancellationToken);
                    if (p != null)
                    {
                        await _cacheService.SetProdutoCacheAsync(p.Codigo, p.Descricao, p.Saldo, context.CancellationToken);
                    }
                }
            }

            // 4. Marcação da chave de Idempotência no Redis (válido por 7 dias)
            await _idempotencyService.SaveRequestAsync(idempotencyKey, TimeSpan.FromDays(7), context.CancellationToken);

            // 5. Publicação do evento de confirmação de estoque abatido com sucesso
            await context.Publish(new NotaFiscalAbatidaEvent(
                message.NotaFiscalId,
                DateTime.UtcNow
            ), context.CancellationToken);

            _logger.LogInformation("Estoque debitado com sucesso para a Nota Fiscal {NotaFiscalId} com CorrelationId {CorrelationId}.", message.NotaFiscalId, correlationId);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning(ex, "Falha de regra de negócio ao debitar estoque para Nota Fiscal {NotaFiscalId} (CorrelationId {CorrelationId}). Publicando cancelamento.", message.NotaFiscalId, correlationId);

            await context.Publish(new AbatimentoEstoqueFalhouEvent(
                message.NotaFiscalId,
                ex.Message,
                DateTime.UtcNow
            ), context.CancellationToken);
        }
        catch (Exception ex)
        {
            var retryCount = context.GetRetryCount();
            if (retryCount < 3)
            {
                _logger.LogWarning(ex, "Tentativa {Attempt}/3 de débito de estoque falhou para Nota Fiscal {NotaFiscalId} (CorrelationId {CorrelationId}). Reenfileirando no RabbitMQ.", retryCount + 1, message.NotaFiscalId, correlationId);
                throw;
            }

            _logger.LogError(ex, "Falha definitiva após 3 retentativas para Nota Fiscal {NotaFiscalId} (CorrelationId {CorrelationId}). Cancelando nota.", message.NotaFiscalId, correlationId);

            await context.Publish(new AbatimentoEstoqueFalhouEvent(
                message.NotaFiscalId,
                $"Falha de concorrência/infraestrutura após 3 retentativas: {ex.Message}",
                DateTime.UtcNow
            ), context.CancellationToken);
        }
        finally
        {
            foreach (var lockObj in locks)
            {
                lockObj.Dispose();
            }
        }
        }
    }
}

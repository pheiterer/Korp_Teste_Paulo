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
            // 2. Aquisição de Trava Distribuída (Redlock) ordenada por código do produto
            var itensOrdenados = message.Itens.OrderBy(i => i.CodigoProduto).ToList();
            foreach (var item in itensOrdenados)
            {
                var resourceKey = $"produto:{item.CodigoProduto.Trim().ToUpperInvariant()}";
                var lockObj = await _distributedLockService.AcquireLockAsync(resourceKey, TimeSpan.FromSeconds(3), TimeSpan.FromSeconds(5), context.CancellationToken);

                if (lockObj == null)
                {
                    throw new InvalidOperationException($"Não foi possível adquirir a trava distribuída para o produto '{item.CodigoProduto}'.");
                }

                locks.Add(lockObj);
            }

            // 3. Processamento Atômico com Transação do Banco de Dados
            await using var transaction = await _context.Database.BeginTransactionAsync(context.CancellationToken);

            foreach (var item in message.Itens)
            {
                var produto = await _produtoRepository.GetByCodigoAsync(item.CodigoProduto, context.CancellationToken);
                if (produto == null)
                {
                    throw new DomainException($"Produto com código '{item.CodigoProduto}' não foi encontrado no estoque.");
                }

                // Debita o saldo (lança DomainException se saldo insuficiente)
                produto.DebitarSaldo(item.Quantidade);
                _produtoRepository.Update(produto);
            }

            await _produtoRepository.SaveChangesAsync(context.CancellationToken);
            await transaction.CommitAsync(context.CancellationToken);

            // Atualiza o saldo no Redis Cache
            if (_cacheService != null)
            {
                foreach (var item in message.Itens)
                {
                    var p = await _produtoRepository.GetByCodigoAsync(item.CodigoProduto, context.CancellationToken);
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
            _logger.LogError(ex, "Falha de regra de negócio ao debitar estoque para Nota Fiscal {NotaFiscalId} com CorrelationId {CorrelationId}. Publicando evento de falha.", message.NotaFiscalId, correlationId);

            // Publica evento de falha para acionar a Saga Compensatória no Faturamento
            await context.Publish(new AbatimentoEstoqueFalhouEvent(
                message.NotaFiscalId,
                ex.Message,
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

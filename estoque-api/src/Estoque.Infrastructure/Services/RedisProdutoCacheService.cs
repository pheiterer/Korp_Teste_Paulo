using System.Text.Json;
using Estoque.Application.Interfaces;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Estoque.Infrastructure.Services;

public class RedisProdutoCacheService : IProdutoCacheService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisProdutoCacheService> _logger;

    public RedisProdutoCacheService(IConnectionMultiplexer redis, ILogger<RedisProdutoCacheService> logger)
    {
        _redis = redis ?? throw new ArgumentNullException(nameof(redis));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task SetProdutoCacheAsync(string codigo, string descricao, int saldo, CancellationToken cancellationToken = default)
    {
        try
        {
            var db = _redis.GetDatabase();
            var key = $"produto:codigo:{codigo.Trim().ToUpperInvariant()}";
            var payload = JsonSerializer.Serialize(new
            {
                codigo = codigo.Trim().ToUpperInvariant(),
                descricao = descricao,
                saldo = saldo
            });

            await db.StringSetAsync(key, payload, TimeSpan.FromHours(24));
            _logger.LogInformation("Produto {Codigo} publicado no cache do Redis com TTL de 24 horas.", codigo);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao salvar produto {Codigo} no cache do Redis.", codigo);
        }
    }

    public async Task UpdateSaldoCacheAsync(string codigo, int novoSaldo, CancellationToken cancellationToken = default)
    {
        try
        {
            var db = _redis.GetDatabase();
            var key = $"produto:codigo:{codigo.Trim().ToUpperInvariant()}";
            var val = await db.StringGetAsync(key);

            string descricao = "";
            if (val.HasValue)
            {
                using var doc = JsonDocument.Parse(val.ToString());
                if (doc.RootElement.TryGetProperty("descricao", out var descProp))
                {
                    descricao = descProp.GetString() ?? "";
                }
            }

            await SetProdutoCacheAsync(codigo, descricao, novoSaldo, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao atualizar saldo no Redis para produto {Codigo}.", codigo);
        }
    }
}

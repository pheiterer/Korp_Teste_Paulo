using Estoque.Application.Interfaces;
using StackExchange.Redis;

namespace Estoque.Infrastructure.Services;

public class RedisIdempotencyService : IIdempotencyService
{
    private readonly IConnectionMultiplexer _redis;

    public RedisIdempotencyService(IConnectionMultiplexer redis)
    {
        _redis = redis ?? throw new ArgumentNullException(nameof(redis));
    }

    public async Task<bool> RequestExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        var db = _redis.GetDatabase();
        var fullKey = $"idempotency:{key}";
        return await db.KeyExistsAsync(fullKey);
    }

    public async Task SaveRequestAsync(string key, TimeSpan expiry, CancellationToken cancellationToken = default)
    {
        var db = _redis.GetDatabase();
        var fullKey = $"idempotency:{key}";
        await db.StringSetAsync(fullKey, "processed", expiry);
    }
}

using Estoque.Application.Interfaces;
using RedLockNet.SERedis;
using RedLockNet.SERedis.Configuration;
using StackExchange.Redis;

namespace Estoque.Infrastructure.Services;

public class RedisLockService : IDistributedLockService, IDisposable
{
    private readonly RedLockFactory _redLockFactory;

    public RedisLockService(IConnectionMultiplexer redis)
    {
        if (redis == null) throw new ArgumentNullException(nameof(redis));
        var multiplexers = new List<RedLockMultiplexer> { new RedLockMultiplexer(redis) };
        _redLockFactory = RedLockFactory.Create(multiplexers);
    }

    public async Task<IDisposable?> AcquireLockAsync(string resourceKey, TimeSpan waitTime, TimeSpan expiryTime, CancellationToken cancellationToken = default)
    {
        var resource = $"lock:{resourceKey}";
        var redLock = await _redLockFactory.CreateLockAsync(resource, expiryTime, waitTime, TimeSpan.FromMilliseconds(200), cancellationToken);

        if (redLock.IsAcquired)
        {
            return redLock;
        }

        return null;
    }

    public void Dispose()
    {
        _redLockFactory.Dispose();
    }
}

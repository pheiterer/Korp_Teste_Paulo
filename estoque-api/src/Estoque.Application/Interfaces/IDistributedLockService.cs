namespace Estoque.Application.Interfaces;

public interface IDistributedLockService
{
    Task<IDisposable?> AcquireLockAsync(string resourceKey, TimeSpan waitTime, TimeSpan expiryTime, CancellationToken cancellationToken = default);
}

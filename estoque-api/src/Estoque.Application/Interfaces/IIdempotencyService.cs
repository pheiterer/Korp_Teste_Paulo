namespace Estoque.Application.Interfaces;

public interface IIdempotencyService
{
    Task<bool> RequestExistsAsync(string key, CancellationToken cancellationToken = default);
    Task SaveRequestAsync(string key, TimeSpan expiry, CancellationToken cancellationToken = default);
}

import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { correlationIdInterceptor } from './correlation-id.interceptor';

describe('correlationIdInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([correlationIdInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('deve injetar o cabeçalho X-Correlation-ID caso não exista', () => {
    httpClient.get('/test-endpoint').subscribe();

    const req = httpTestingController.expectOne('/test-endpoint');
    expect(req.request.headers.has('X-Correlation-ID')).toBe(true);
    const correlationId = req.request.headers.get('X-Correlation-ID');
    expect(correlationId).toBeTruthy();
    expect(correlationId?.length).toBeGreaterThan(10);
  });

  it('deve preservar o cabeçalho X-Correlation-ID se já tiver sido fornecido', () => {
    const customId = 'custom-correlation-12345';
    httpClient.get('/test-endpoint', {
      headers: { 'X-Correlation-ID': customId }
    }).subscribe();

    const req = httpTestingController.expectOne('/test-endpoint');
    expect(req.request.headers.get('X-Correlation-ID')).toBe(customId);
  });
});

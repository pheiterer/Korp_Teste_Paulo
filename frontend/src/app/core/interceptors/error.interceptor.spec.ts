import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { ToastService } from '../services/toast.service';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let toastService: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ToastService,
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('deve interceptar erro 400 Bad Request e acionar ToastService', () => {
    httpClient.get('/error-test').subscribe({
      error: () => {}
    });

    const req = httpTestingController.expectOne('/error-test');
    req.flush(
      { title: 'Payload Inválido', detail: 'O campo Saldo não pode ser negativo.' },
      { status: 400, statusText: 'Bad Request' }
    );

    const toasts = toastService.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].title).toBe('Payload Inválido');
  });

  it('deve formatar mensagens técnicas do ASP.NET Core ValidationProblemDetails de forma amigável', () => {
    httpClient.get('/error-validation').subscribe({
      error: () => {}
    });

    const req = httpTestingController.expectOne('/error-validation');
    req.flush(
      {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: {
          request: ['The request field is required.'],
          '$.saldoInicial': ['The JSON value could not be converted to Estoque.Application.DTOs.CreateProdutoRequest. Path: $.saldoInicial | LineNumber: 0 | BytePositionInLine: 58.']
        }
      },
      { status: 400, statusText: 'Bad Request' }
    );

    const toasts = toastService.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].title).toBe('Erro de Validação');
    expect(toasts[0].message).toContain('O campo "Saldo Inicial" deve conter um valor numérico inteiro válido.');
  });
});

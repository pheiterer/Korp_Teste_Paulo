import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotaFiscalService } from './nota-fiscal.service';
import { NotaFiscal } from '../models/nota-fiscal.model';

describe('NotaFiscalService', () => {
  let service: NotaFiscalService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotaFiscalService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(NotaFiscalService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('deve buscar notas fiscais', () => {
    const mockNotas: NotaFiscal[] = [
      { id: 1, status: 'Aberta', valorTotal: 100, itens: [] }
    ];

    service.getNotasFiscais().subscribe(data => {
      expect(data.length).toBe(1);
      expect(data[0].status).toBe('Aberta');
    });

    const req = httpTestingController.expectOne(req => req.url.includes('/api/v1/notas-fiscais'));
    expect(req.request.method).toBe('GET');
    req.flush(mockNotas);
  });
});

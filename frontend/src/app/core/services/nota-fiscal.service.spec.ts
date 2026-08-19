import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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

  it('deve buscar notas fiscais com payload no formato de APIResponse ({ success: true, data: [...] })', () => {
    const apiResponse = {
      success: true,
      data: [
        {
          id: 4,
          uuid: '8af79b37-e18c-424c-8cb6-c11a05a755d5',
          numero_sequencial: 4,
          status: 'Aberta',
          valor_total: 10,
          itens: [
            {
              id: 7,
              nota_fiscal_id: 4,
              produto_id: 0,
              codigo_produto: 'IDSKJADJ',
              quantidade: 1,
              preco_unitario: 10,
              subtotal: 10
            }
          ]
        }
      ]
    };

    service.getNotasFiscais().subscribe(data => {
      expect(data.length).toBe(1);
      expect(data[0].id).toBe(4);
      expect(data[0].valorTotal).toBe(10);
      expect(data[0].itens[0].codigoProduto).toBe('IDSKJADJ');
      expect(service.notasFiscais().length).toBe(1);
      expect(service.notasFiscais()[0].valorTotal).toBe(10);
    });

    const req = httpTestingController.expectOne(req => req.url.includes('/api/v1/notas-fiscais'));
    expect(req.request.method).toBe('GET');
    req.flush(apiResponse);
  });

  it('deve solicitar impressao de nota fiscal e alterar status para EmProcessamento', () => {
    const notaOriginal: NotaFiscal = { id: 10, status: 'Aberta', valorTotal: 250, itens: [] };
    service.notasFiscais.set([notaOriginal]);

    service.imprimirNotaFiscal(10).subscribe(res => {
      expect(res).toBeTruthy();
    });

    expect(service.notasFiscais()[0].status).toBe('EmProcessamento');

    const req = httpTestingController.expectOne(req => req.url.includes('/api/v1/notas-fiscais/10/imprimir'));
    expect(req.request.method).toBe('POST');
    req.flush({ status: 'EmProcessamento' });

    expect(service.notasFiscais()[0].status).toBe('EmProcessamento');
  });

  it('deve atualizar status da nota fiscal reativamente', () => {
    const nota: NotaFiscal = { id: 12, status: 'EmProcessamento', valorTotal: 500, itens: [] };
    service.notasFiscais.set([nota]);

    service.atualizarStatusNota(12, 'Fechada');

    expect(service.notasFiscais()[0].status).toBe('Fechada');
  });
});

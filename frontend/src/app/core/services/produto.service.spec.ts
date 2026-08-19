import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProdutoService } from './produto.service';
import { Produto } from '../models/produto.model';

describe('ProdutoService', () => {
  let service: ProdutoService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProdutoService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ProdutoService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('deve buscar lista de produtos', () => {
    const mockProdutos: Produto[] = [
      { codigo: 'P1', descricao: 'Prod 1', saldo: 10 },
      { codigo: 'P2', descricao: 'Prod 2', saldo: 5 }
    ];

    service.getProdutos().subscribe(data => {
      expect(data.length).toBe(2);
      expect(data[0].codigo).toBe('P1');
    });

    const req = httpTestingController.expectOne(req => req.url.includes('/api/produtos'));
    expect(req.request.method).toBe('GET');
    req.flush(mockProdutos);
  });

  it('deve enviar requisição de cadastro de produto', () => {
    const newProd = { codigo: 'NEW-01', descricao: 'Novo Produto', saldoInicial: 20 };

    service.criarProduto(newProd).subscribe(res => {
      expect(res.codigo).toBe('NEW-01');
    });

    const req = httpTestingController.expectOne(req => req.url.includes('/api/produtos'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newProd);
    req.flush({ codigo: 'NEW-01', descricao: 'Novo Produto', saldo: 20 });
  });
});

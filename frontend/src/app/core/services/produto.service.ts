import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Produto, CreateProdutoRequest } from '../models/produto.model';

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiGatewayUrl}/api/produtos`;

  readonly produtos = signal<Produto[]>([]);
  readonly loading = signal<boolean>(false);

  getProdutos(busca?: string): Observable<Produto[]> {
    this.loading.set(true);
    let params = new HttpParams();
    if (busca && busca.trim().length > 0) {
      params = params.set('busca', busca.trim());
    }

    return this.http.get<Produto[]>(this.apiUrl, { params }).pipe(
      tap({
        next: (data) => {
          this.produtos.set(data || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      })
    );
  }

  criarProduto(request: CreateProdutoRequest): Observable<Produto> {
    return this.http.post<Produto>(this.apiUrl, request).pipe(
      tap((novoProduto) => {
        this.produtos.update(list => [novoProduto, ...list]);
      })
    );
  }
}

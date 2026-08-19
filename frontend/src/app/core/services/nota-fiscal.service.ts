import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotaFiscal, CreateNotaFiscalRequest } from '../models/nota-fiscal.model';

@Injectable({
  providedIn: 'root'
})
export class NotaFiscalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiGatewayUrl}/api/v1/notas-fiscais`;

  readonly notasFiscais = signal<NotaFiscal[]>([]);
  readonly loading = signal<boolean>(false);

  getNotasFiscais(): Observable<NotaFiscal[]> {
    this.loading.set(true);
    return this.http.get<NotaFiscal[]>(this.apiUrl).pipe(
      tap({
        next: (data) => {
          this.notasFiscais.set(data || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      })
    );
  }

  criarNotaFiscal(request: CreateNotaFiscalRequest): Observable<NotaFiscal> {
    return this.http.post<NotaFiscal>(this.apiUrl, request).pipe(
      tap((novaNota) => {
        this.notasFiscais.update(list => [novaNota, ...list]);
      })
    );
  }

  imprimirNotaFiscal(id: string | number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/imprimir`, {}).pipe(
      tap(() => {
        this.notasFiscais.update(list =>
          list.map(nota => (String(nota.id) === String(id) || nota.uuid === String(id)) ? { ...nota, status: 'EmProcessamento' } : nota)
        );
      })
    );
  }

  atualizarStatusNota(id: string | number, status: NotaFiscal['status']): void {
    this.notasFiscais.update(list =>
      list.map(nota => (String(nota.id) === String(id) || nota.uuid === String(id)) ? { ...nota, status } : nota)
    );
  }
}

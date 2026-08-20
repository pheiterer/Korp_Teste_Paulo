import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
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
  readonly pagination = signal<{ page: number; limit: number; total: number; total_pages: number } | null>(null);

  private normalizeNotaFiscal(item: any): NotaFiscal {
    return {
      ...item,
      id: item.id,
      uuid: item.uuid,
      numeroSequencial: item.numeroSequencial ?? item.numero_sequencial,
      numero_sequencial: item.numero_sequencial ?? item.numeroSequencial,
      status: item.status,
      motivoCancelamento: item.motivoCancelamento ?? item.motivo_cancelamento,
      motivo_cancelamento: item.motivo_cancelamento ?? item.motivoCancelamento,
      valorTotal: Number(item.valorTotal ?? item.valor_total ?? 0),
      valor_total: Number(item.valor_total ?? item.valorTotal ?? 0),
      created_at: item.created_at,
      updated_at: item.updated_at,
      dataCriacao: item.dataCriacao ?? item.created_at,
      itens: Array.isArray(item.itens) ? item.itens.map((it: any) => ({
        ...it,
        codigoProduto: it.codigoProduto || it.codigo_produto || '',
        codigo_produto: it.codigo_produto || it.codigoProduto || '',
        quantidade: Number(it.quantidade || 0),
        precoUnitario: Number(it.precoUnitario ?? it.preco_unitario ?? 0),
        preco_unitario: Number(it.preco_unitario ?? it.precoUnitario ?? 0),
        subtotal: Number(it.subtotal ?? (Number(it.quantidade || 0) * Number(it.preco_unitario ?? it.precoUnitario ?? 0))),
        motivoErro: it.motivoErro || it.motivo_erro || '',
        motivo_erro: it.motivo_erro || it.motivoErro || ''
      })) : []
    };
  }

  getNotasFiscais(page: number = 1, limit: number = 10, status: string = ''): Observable<{ items: NotaFiscal[]; pagination?: any }> {
    this.loading.set(true);
    const params: any = { page: page.toString(), limit: limit.toString() };
    if (status && status !== 'Todas') {
      params.status = status;
    }
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        const dataObj = res?.data;
        const rawList = Array.isArray(res)
          ? res
          : (Array.isArray(dataObj) ? dataObj : (dataObj?.items || []));
        const pagination = dataObj?.pagination || null;
        const normalized = rawList.map((item: any) => this.normalizeNotaFiscal(item));
        return { items: normalized, pagination };
      }),
      tap({
        next: (result) => {
          this.notasFiscais.set(result.items || []);
          if (result.pagination) {
            this.pagination.set(result.pagination);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  criarNotaFiscal(request: CreateNotaFiscalRequest): Observable<NotaFiscal> {
    return this.http.post<any>(this.apiUrl, request).pipe(
      map(res => {
        const rawItem = res?.data ?? res;
        return this.normalizeNotaFiscal(rawItem);
      }),
      tap((novaNota) => {
        this.notasFiscais.update(list => [novaNota, ...list]);
      })
    );
  }

  imprimirNotaFiscal(id: string | number): Observable<any> {
    // Muda o status localmente para "EmProcessamento" imediatamente
    this.atualizarStatusNota(id, 'EmProcessamento');

    return this.http.post<any>(`${this.apiUrl}/${id}/imprimir`, {}).pipe(
      tap(() => {
        this.atualizarStatusNota(id, 'EmProcessamento');
      }),
      catchError((err) => {
        // Se a requisição falhar (ex: HTTP 400 Bad Request se nota não estiver Aberta), restaura/mantém a integridade
        return throwError(() => err);
      })
    );
  }

  atualizarStatusNota(id: string | number, status: NotaFiscal['status'], motivo?: string): void {
    const targetStr = String(id || '').trim().toLowerCase();
    this.notasFiscais.update(list =>
      list.map(nota => {
        const notaIdStr = String(nota.id || '').trim().toLowerCase();
        const notaUuidStr = String(nota.uuid || '').trim().toLowerCase();
        if (notaIdStr === targetStr || (notaUuidStr && notaUuidStr === targetStr)) {
          return {
            ...nota,
            status,
            motivoCancelamento: motivo || nota.motivoCancelamento,
            motivo_cancelamento: motivo || nota.motivo_cancelamento
          };
        }
        return nota;
      })
    );
  }
}

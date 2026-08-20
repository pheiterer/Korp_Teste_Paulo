import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotaFiscalService } from '../../../../core/services/nota-fiscal.service';
import { SignalRService } from '../../../../core/services/signalr.service';
import { ProdutoService } from '../../../../core/services/produto.service';
import { ToastService } from '../../../../core/services/toast.service';
import { NotaFiscal, NotaFiscalStatus } from '../../../../core/models/nota-fiscal.model';

@Component({
  selector: 'app-nota-fiscal-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card list-card">
      <div class="list-header">
        <div class="header-info">
          <h3>Consulta de Notas Fiscais</h3>
          <p class="subtitle">Acompanhe a máquina de estados e o status de processamento em tempo real.</p>
        </div>

        <!-- Filter Chips -->
        <div class="filter-chips">
          <button class="chip" [class.active]="statusFiltro() === 'Todas'" (click)="setFiltro('Todas')">Todas</button>
          <button class="chip chip-blue" [class.active]="statusFiltro() === 'Aberta'" (click)="setFiltro('Aberta')">Aberta</button>
          <button class="chip chip-amber" [class.active]="statusFiltro() === 'EmProcessamento'" (click)="setFiltro('EmProcessamento')">Em Processamento</button>
          <button class="chip chip-emerald" [class.active]="statusFiltro() === 'Fechada'" (click)="setFiltro('Fechada')">Fechada</button>
          <button class="chip chip-red" [class.active]="statusFiltro() === 'Cancelada'" (click)="setFiltro('Cancelada')">Cancelada</button>
        </div>
      </div>

      <!-- Loading State -->
      @if (notaFiscalService.loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Carregando notas fiscais...</span>
        </div>
      } @else if (notasFiltradas.length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <h4>Nenhuma nota fiscal encontrada</h4>
          <p>Crie uma nova nota fiscal para iniciar o processo de emissão e abatimento de estoque.</p>
        </div>
      } @else {
        <!-- Table -->
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID / UUID</th>
                <th class="text-right">Valor Total</th>
                <th class="text-center">Status</th>
                <th class="text-center">Itens</th>
                <th class="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              @for (nota of notasFiltradas; track nota.id) {
                <tr class="table-row">
                  <td class="code-cell font-mono">
                    <div class="code-box">
                      <span class="nota-seq">#{{ nota.id }}</span>
                      @if (nota.uuid) {
                        <span class="uuid-sub font-mono">{{ nota.uuid | slice:0:8 }}...</span>
                      }
                    </div>
                  </td>
                  <td class="text-right font-mono valor-cell">
                    {{ nota.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>
                  <td class="text-center">
                    <span [ngClass]="getBadgeClass(nota.status)">
                      @if (nota.status === 'EmProcessamento') {
                        <span class="mini-spinner"></span>
                      }
                      {{ formatStatus(nota.status) }}
                    </span>
                  </td>
                  <td class="text-center">
                    <button type="button" (click)="toggleExpand(nota.id)" class="btn-expand">
                      {{ nota.itens.length || 0 }} item(ns)
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.rotated]="isExpanded(nota.id)"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </td>
                  <td class="text-right">
                    <button
                      type="button"
                      class="btn btn-primary btn-xs"
                      [disabled]="nota.status !== 'Aberta' || imprimindoId() === nota.id"
                      (click)="imprimir(nota.id)"
                    >
                      @if (imprimindoId() === nota.id) {
                        <span class="mini-spinner"></span> Enviando...
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        Imprimir Nota
                      }
                    </button>
                  </td>
                </tr>

                <!-- Expanded Items Row -->
                @if (isExpanded(nota.id)) {
                  <tr class="expanded-row">
                    <td colspan="5">
                      <div class="expanded-box">
                        <div class="expanded-header">
                          <h5>Itens da Nota Fiscal #{{ nota.id }}</h5>
                          @if (nota.status === 'Cancelada' && (nota.motivoCancelamento || nota.motivo_cancelamento)) {
                            @let parsed = parseMotivo(nota.motivoCancelamento || nota.motivo_cancelamento);
                            <div class="cancel-reason-banner">
                              <span class="banner-icon">⚠️</span>
                              <div class="banner-text">
                                <strong>Motivo do Cancelamento:</strong>
                                @if (parsed.summary) {
                                  <p class="banner-summary">{{ parsed.summary }}</p>
                                }
                                @if (parsed.items.length > 0) {
                                  <ul class="reason-bullets">
                                    @for (itemReason of parsed.items; track $index) {
                                      <li>{{ itemReason }}</li>
                                    }
                                  </ul>
                                }
                              </div>
                            </div>
                          }
                        </div>
                        <table class="nested-table">
                          <thead>
                            <tr>
                              <th>Produto</th>
                              <th class="text-right">Quantidade</th>
                              <th class="text-right">Preço Unitário</th>
                              <th class="text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (item of nota.itens; track $index) {
                              <tr>
                                <td class="font-mono">
                                  {{ item.codigoProduto || item.codigo_produto }}
                                  @if (item.motivoErro || item.motivo_erro) {
                                    <div class="item-error-msg">⚠️ {{ item.motivoErro || item.motivo_erro }}</div>
                                  }
                                </td>
                                <td class="text-right font-mono">{{ item.quantidade }}</td>
                                <td class="text-right font-mono">{{ (item.precoUnitario || item.preco_unitario || 0) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</td>
                                <td class="text-right font-mono text-emerald">
                                  {{ (item.quantidade * (item.precoUnitario || item.preco_unitario || 0)) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                                </td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        @if (notaFiscalService.pagination(); as pag) {
          <div class="pagination-bar">
            <span class="page-info">Página {{ pag.page }} de {{ pag.total_pages }} (Total: {{ pag.total }} notas)</span>
            <div class="page-buttons">
              <button type="button" class="btn-page" [disabled]="pag.page <= 1" (click)="mudarPagina(pag.page - 1)">◀ Anterior</button>
              <button type="button" class="btn-page" [disabled]="pag.page >= pag.total_pages" (click)="mudarPagina(pag.page + 1)">Próxima ▶</button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styleUrls: ['./nota-fiscal-list.component.scss']
})
export class NotaFiscalListComponent implements OnInit {
  readonly notaFiscalService = inject(NotaFiscalService);
  private signalRService = inject(SignalRService);
  private produtoService = inject(ProdutoService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly statusFiltro = signal<string>('Todas');
  readonly expandedIds = signal<Set<string | number>>(new Set());
  readonly imprimindoId = signal<string | number | null>(null);

  get notasFiltradas(): NotaFiscal[] {
    return this.notaFiscalService.notasFiscais();
  }

  ngOnInit(): void {
    this.carregarNotas();
    this.inscreverEventosSignalR();
  }

  carregarNotas(page: number = 1): void {
    this.notaFiscalService.getNotasFiscais(page, 10, this.statusFiltro()).subscribe();
  }

  mudarPagina(novaPagina: number): void {
    if (novaPagina < 1) return;
    this.carregarNotas(novaPagina);
  }

  private inscreverEventosSignalR(): void {
    // Reação ao evento de sucesso no abatimento de estoque via SignalR
    this.signalRService.notaFiscalAbatida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(notificacao => {
        if (notificacao.notaFiscalId) {
          this.notaFiscalService.atualizarStatusNota(notificacao.notaFiscalId, 'Fechada');
          this.produtoService.getProdutos().subscribe();
          setTimeout(() => {
            const pag = this.notaFiscalService.pagination();
            this.carregarNotas(pag ? pag.page : 1);
          }, 300);
        }
      });

    // Reação ao evento de falha no abatimento (transação compensatória Saga) via SignalR
    this.signalRService.abatimentoEstoqueFalhou$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(notificacao => {
        if (notificacao.notaFiscalId) {
          this.notaFiscalService.atualizarStatusNota(notificacao.notaFiscalId, 'Cancelada', notificacao.reason);
          setTimeout(() => {
            const pag = this.notaFiscalService.pagination();
            this.carregarNotas(pag ? pag.page : 1);
          }, 300);
        }
      });
  }

  setFiltro(status: string): void {
    this.statusFiltro.set(status);
    this.carregarNotas(1);
  }

  toggleExpand(id: string | number): void {
    this.expandedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isExpanded(id: string | number): boolean {
    return this.expandedIds().has(id);
  }

  formatStatus(status: NotaFiscalStatus | string): string {
    switch (status) {
      case 'EmProcessamento': return 'Em Processamento';
      case 'Aberta': return 'Aberta';
      case 'Fechada': return 'Fechada';
      case 'Cancelada': return 'Cancelada';
      default: return status || '—';
    }
  }

  getBadgeClass(status: NotaFiscalStatus): string {
    switch (status) {
      case 'Aberta': return 'badge badge-blue';
      case 'EmProcessamento': return 'badge badge-amber';
      case 'Fechada': return 'badge badge-emerald';
      case 'Cancelada': return 'badge badge-red';
      default: return 'badge';
    }
  }

  imprimir(id: string | number): void {
    this.imprimindoId.set(id);

    this.notaFiscalService.imprimirNotaFiscal(id).subscribe({
      next: () => {
        this.imprimindoId.set(null);
        this.toastService.info(
          'Impressão Solicitada',
          `Solicitação de impressão da Nota Fiscal #${id} enviada com sucesso!`
        );
      },
      error: (err) => {
        this.imprimindoId.set(null);
        const erroMsg = err?.error?.detail || err?.error?.title || 'Não foi possível solicitar a impressão.';
        this.toastService.error('Erro na Impressão', erroMsg);
      }
    });
  }

  parseMotivo(motivo: string | undefined): { summary: string; items: string[] } {
    if (!motivo) return { summary: '', items: [] };

    const str = motivo.trim();

    // Se contiver múltiplos itens separados por " | "
    if (str.includes(' | ')) {
      const parts = str.split(' | ');
      let summary = '';
      const items: string[] = [];

      const firstPart = parts[0];
      if (firstPart.includes(': ')) {
        const idx = firstPart.indexOf(': ');
        summary = firstPart.substring(0, idx).trim();
        items.push(firstPart.substring(idx + 2).trim());
      } else {
        items.push(firstPart.trim());
      }

      for (let i = 1; i < parts.length; i++) {
        items.push(parts[i].trim());
      }

      return { summary, items };
    }

    // Se for item único com formato "Falha no estoque (...): Item ..."
    if (str.includes(': Item ')) {
      const idx = str.indexOf(': Item ');
      const summary = str.substring(0, idx).trim();
      const itemMsg = str.substring(idx + 2).trim();
      return { summary, items: [itemMsg] };
    }

    return { summary: '', items: [str] };
  }
}

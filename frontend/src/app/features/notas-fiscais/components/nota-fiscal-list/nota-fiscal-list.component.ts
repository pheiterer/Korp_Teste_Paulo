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
                    #{{ nota.id }}
                    @if (nota.uuid) {
                      <span class="uuid-sub font-mono">{{ nota.uuid | slice:0:8 }}...</span>
                    }
                  </td>
                  <td class="text-right font-mono valor-cell">
                    {{ nota.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                  </td>
                  <td class="text-center">
                    <span [ngClass]="getBadgeClass(nota.status)">
                      @if (nota.status === 'EmProcessamento') {
                        <span class="mini-spinner"></span>
                      }
                      {{ nota.status }}
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
                        <h5>Itens da Nota Fiscal #{{ nota.id }}</h5>
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
                                <td class="font-mono">{{ item.codigoProduto || item.codigo_produto }}</td>
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
    const list = this.notaFiscalService.notasFiscais();
    const filtro = this.statusFiltro();
    if (filtro === 'Todas') return list;
    return list.filter(n => n.status === filtro);
  }

  ngOnInit(): void {
    this.carregarNotas();
    this.inscreverEventosSignalR();
  }

  carregarNotas(): void {
    this.notaFiscalService.getNotasFiscais().subscribe();
  }

  private inscreverEventosSignalR(): void {
    // Reação ao evento de sucesso no abatimento de estoque via SignalR
    this.signalRService.notaFiscalAbatida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(notificacao => {
        if (notificacao.notaFiscalId) {
          this.notaFiscalService.atualizarStatusNota(notificacao.notaFiscalId, 'Fechada');
          this.produtoService.getProdutos().subscribe();
          this.notaFiscalService.getNotasFiscais().subscribe();
        }
      });

    // Reação ao evento de falha no abatimento (transação compensatória Saga) via SignalR
    this.signalRService.abatimentoEstoqueFalhou$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(notificacao => {
        if (notificacao.notaFiscalId) {
          this.notaFiscalService.atualizarStatusNota(notificacao.notaFiscalId, 'Cancelada');
          this.notaFiscalService.getNotasFiscais().subscribe();
        }
      });
  }

  setFiltro(status: string): void {
    this.statusFiltro.set(status);
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
          `Nota Fiscal #${id} alterada para "EmProcessamento" e publicada no RabbitMQ!`
        );
      },
      error: (err) => {
        this.imprimindoId.set(null);
        const erroMsg = err?.error?.detail || err?.error?.title || 'Não foi possível solicitar a impressão.';
        this.toastService.error('Erro na Impressão', erroMsg);
      }
    });
  }
}

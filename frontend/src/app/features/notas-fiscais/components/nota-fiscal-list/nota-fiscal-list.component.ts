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
  templateUrl: './nota-fiscal-list.component.html',
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

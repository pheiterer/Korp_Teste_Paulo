import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SignalRService } from '../../core/services/signalr.service';
import { ProdutoService } from '../../core/services/produto.service';
import { NotaFiscalService } from '../../core/services/nota-fiscal.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  readonly signalRService = inject(SignalRService);
  readonly produtoService = inject(ProdutoService);
  readonly notaFiscalService = inject(NotaFiscalService);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.carregarDados();
    this.inscreverEventosSignalR();
  }

  carregarDados(): void {
    this.produtoService.getProdutos().subscribe();
    this.notaFiscalService.getNotasFiscais().subscribe();
  }

  private inscreverEventosSignalR(): void {
    this.signalRService.notaFiscalAbatida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(notificacao => {
        if (notificacao?.notaFiscalId) {
          this.notaFiscalService.atualizarStatusNota(notificacao.notaFiscalId, 'Fechada');
        }
        setTimeout(() => {
          this.carregarDados();
        }, 300);
      });

    this.signalRService.abatimentoEstoqueFalhou$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(notificacao => {
        if (notificacao?.notaFiscalId) {
          this.notaFiscalService.atualizarStatusNota(notificacao.notaFiscalId, 'Cancelada');
        }
        setTimeout(() => {
          this.carregarDados();
        }, 300);
      });
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'EmProcessamento': return 'Em Processamento';
      case 'Aberta': return 'Aberta';
      case 'Fechada': return 'Fechada';
      case 'Cancelada': return 'Cancelada';
      default: return status || '—';
    }
  }

  getBadgeClassNota(status: string): string {
    switch (status) {
      case 'Aberta': return 'badge badge-blue';
      case 'EmProcessamento': return 'badge badge-amber';
      case 'Fechada': return 'badge badge-emerald';
      case 'Cancelada': return 'badge badge-red';
      default: return 'badge';
    }
  }
}

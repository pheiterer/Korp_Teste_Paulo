import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotaFiscalCadastroComponent } from './components/nota-fiscal-cadastro/nota-fiscal-cadastro.component';
import { NotaFiscalListComponent } from './components/nota-fiscal-list/nota-fiscal-list.component';
import { NotaFiscalService } from '../../core/services/nota-fiscal.service';

@Component({
  selector: 'app-notas-fiscais',
  standalone: true,
  imports: [CommonModule, NotaFiscalCadastroComponent, NotaFiscalListComponent],
  template: `
    <div class="notas-page">
      <div class="page-header">
        <h1 class="page-title">Gestão & Emissão de Notas Fiscais</h1>
        <p class="page-subtitle">Gere notas com múltiplos itens e dispare a máquina de estados assíncrona.</p>
      </div>

      <div class="notas-grid">
        <div class="grid-col-form">
          <app-nota-fiscal-cadastro (notaCadastrada)="onNotaCadastrada()"></app-nota-fiscal-cadastro>
        </div>
        <div class="grid-col-list">
          <app-nota-fiscal-list #notaList></app-nota-fiscal-list>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notas-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      .page-title {
        font-size: 1.75rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.02em;
      }

      .page-subtitle {
        font-size: 0.9375rem;
        color: #94a3b8;
        margin-top: 0.25rem;
      }
    }

    .notas-grid {
      display: grid;
      grid-template-columns: 460px 1fr;
      gap: 1.5rem;
      align-items: start;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class NotasFiscaisComponent {
  @ViewChild('notaList') notaList!: NotaFiscalListComponent;
  private notaFiscalService = inject(NotaFiscalService);

  onNotaCadastrada(): void {
    if (this.notaList) {
      this.notaList.carregarNotas();
    } else {
      this.notaFiscalService.getNotasFiscais().subscribe();
    }
  }
}

import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProdutoCadastroComponent } from './components/produto-cadastro/produto-cadastro.component';
import { ProdutoListComponent } from './components/produto-list/produto-list.component';
import { ProdutoService } from '../../core/services/produto.service';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, ProdutoCadastroComponent, ProdutoListComponent],
  template: `
    <div class="produtos-page">
      <div class="page-header">
        <h1 class="page-title">Gestão de Produtos</h1>
        <p class="page-subtitle">Cadastre produtos e acompanhe o saldo atualizado no estoque.</p>
      </div>

      <div class="produtos-grid">
        <div class="grid-col-form">
          <app-produto-cadastro (produtoCadastrado)="onProdutoCadastrado()"></app-produto-cadastro>
        </div>
        <div class="grid-col-list">
          <app-produto-list #produtoList></app-produto-list>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .produtos-page {
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

    .produtos-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 1.5rem;
      align-items: start;

      @media (max-width: 992px) {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProdutosComponent {
  @ViewChild('produtoList') produtoList!: ProdutoListComponent;
  private produtoService = inject(ProdutoService);

  onProdutoCadastrado(): void {
    if (this.produtoList) {
      this.produtoList.carregarProdutos();
    } else {
      this.produtoService.getProdutos().subscribe();
    }
  }
}

import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProdutoCadastroComponent } from './components/produto-cadastro/produto-cadastro.component';
import { ProdutoListComponent } from './components/produto-list/produto-list.component';
import { ProdutoService } from '../../core/services/produto.service';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, ProdutoCadastroComponent, ProdutoListComponent],
  templateUrl: './produtos.component.html',
  styleUrls: ['./produtos.component.scss']
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

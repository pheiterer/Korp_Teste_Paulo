import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ProdutoService } from '../../../../core/services/produto.service';
import { SignalRService } from '../../../../core/services/signalr.service';
import { Produto } from '../../../../core/models/produto.model';

@Component({
  selector: 'app-produto-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './produto-list.component.html',
  styleUrls: ['./produto-list.component.scss']
})
export class ProdutoListComponent implements OnInit {
  readonly produtoService = inject(ProdutoService);
  private signalRService = inject(SignalRService);
  private destroyRef = inject(DestroyRef);

  searchControl = new FormControl('');

  ngOnInit(): void {
    this.carregarProdutos();

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(term => {
      this.carregarProdutos(term || '');
    });

    // Escuta evento SignalR de Nota Fiscal Abatida para atualizar saldo em tempo real
    this.signalRService.notaFiscalAbatida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.carregarProdutos(this.searchControl.value || '');
      });
  }

  carregarProdutos(busca?: string): void {
    this.produtoService.getProdutos(busca).subscribe();
  }
}

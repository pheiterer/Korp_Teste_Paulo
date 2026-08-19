import { Component, EventEmitter, OnInit, Output, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotaFiscalService } from '../../../../core/services/nota-fiscal.service';
import { ProdutoService } from '../../../../core/services/produto.service';
import { SignalRService } from '../../../../core/services/signalr.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Produto } from '../../../../core/models/produto.model';

@Component({
  selector: 'app-nota-fiscal-cadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="glass-card form-card">
      <div class="card-header">
        <div class="header-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          <h3>Nova Nota Fiscal</h3>
        </div>
        <p class="header-subtitle">Adicione múltiplos itens e gere a nota fiscal em status <strong>Aberta</strong>.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-body">
        <!-- Tabela de Itens (FormArray) -->
        <div class="itens-header">
          <label class="form-label">Itens da Nota Fiscal <span class="required">*</span></label>
          <button type="button" (click)="adicionarItem()" class="btn btn-secondary btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar Item
          </button>
        </div>

        <div formArrayName="itens" class="itens-list">
          @for (item of itensControls; track $index; let i = $index) {
            <div [formGroup]="item" class="item-row">
              <!-- Seletor de Produto -->
              <div class="form-group flex-2">
                <label class="form-label-sm">Produto</label>
                <select
                  formControlName="codigoProduto"
                  class="form-control"
                  [class.invalid]="isItemFieldInvalid(i, 'codigoProduto')"
                  (change)="onProductChange(i, $event)"
                >
                  @if (produtos().length === 0) {
                    <option value="" disabled>Nenhum produto cadastrado...</option>
                  }
                  @for (prod of produtos(); track prod.codigo) {
                    <option [value]="prod.codigo">
                      {{ prod.codigo }} - {{ prod.descricao }} (Saldo: {{ prod.saldo }})
                    </option>
                  }
                </select>
                @if (isItemFieldInvalid(i, 'codigoProduto')) {
                  <span class="error-msg">Selecione o produto.</span>
                }
              </div>

              <!-- Quantidade -->
              <div class="form-group flex-1">
                <label class="form-label-sm">Qtd</label>
                <input
                  type="number"
                  formControlName="quantidade"
                  min="1"
                  placeholder="1"
                  class="form-control text-right"
                  [class.invalid]="isItemFieldInvalid(i, 'quantidade')"
                />
                @if (isItemFieldInvalid(i, 'quantidade')) {
                  <span class="error-msg">Min 1.</span>
                }
              </div>

              <!-- Preço Unitário -->
              <div class="form-group flex-1">
                <label class="form-label-sm">Preço R$</label>
                <input
                  type="number"
                  step="0.01"
                  formControlName="precoUnitario"
                  min="0.01"
                  placeholder="0.00"
                  class="form-control text-right"
                  [class.invalid]="isItemFieldInvalid(i, 'precoUnitario')"
                />
                @if (isItemFieldInvalid(i, 'precoUnitario')) {
                  <span class="error-msg">Valor > 0.</span>
                }
              </div>

              <!-- Subtotal do Item -->
              <div class="form-group flex-1 item-subtotal">
                <span class="subtotal-label">Subtotal</span>
                <span class="subtotal-val font-mono">
                  {{ calcularSubtotalItem(i) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                </span>
              </div>

              <!-- Botão Remover -->
              <button
                type="button"
                (click)="removerItem(i)"
                class="btn-remove"
                [disabled]="itensControls.length <= 1"
                aria-label="Remover item"
              >
                &times;
              </button>
            </div>
          }
        </div>

        <!-- Totalizador -->
        <div class="total-bar">
          <span class="total-label">Valor Total da Nota Fiscal:</span>
          <span class="total-value font-mono">{{ valorTotalCalculado | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
        </div>

        <!-- Ações -->
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-full" [disabled]="isSubmitting()">
            @if (isSubmitting()) {
              <span class="spinner"></span> Gerando Nota...
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Cadastrar Nota Fiscal (Aberta)
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./nota-fiscal-cadastro.component.scss']
})
export class NotaFiscalCadastroComponent implements OnInit {
  @Output() notaCadastrada = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private notaFiscalService = inject(NotaFiscalService);
  private produtoService = inject(ProdutoService);
  private signalRService = inject(SignalRService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly isSubmitting = signal(false);
  readonly produtos = this.produtoService.produtos;

  form: FormGroup = this.fb.group({
    itens: this.fb.array([])
  });

  get itensArray(): FormArray {
    return this.form.get('itens') as FormArray;
  }

  get itensControls(): FormGroup[] {
    return this.itensArray.controls as FormGroup[];
  }

  get valorTotalCalculado(): number {
    return this.itensControls.reduce((acc, ctrl) => {
      const qtd = Number(ctrl.get('quantidade')?.value) || 0;
      const preco = Number(ctrl.get('precoUnitario')?.value) || 0;
      return acc + (qtd * preco);
    }, 0);
  }

  ngOnInit(): void {
    this.adicionarItem();
    this.carregarProdutos();
    this.inscreverEventosSignalR();
  }

  carregarProdutos(): void {
    this.produtoService.getProdutos().subscribe();
  }

  private inscreverEventosSignalR(): void {
    this.signalRService.notaFiscalAbatida$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.produtoService.getProdutos().subscribe();
      });
  }

  onProductChange(index: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && this.itensControls[index]) {
      this.itensControls[index].get('codigoProduto')?.setValue(target.value);
    }
  }

  adicionarItem(codigo?: string): void {
    const defaultCodigo = (codigo !== undefined && codigo !== '')
      ? codigo
      : (this.produtos().length > 0 ? this.produtos()[0].codigo : '');

    const itemGroup = this.fb.group({
      codigoProduto: [defaultCodigo, Validators.required],
      quantidade: [1, [Validators.required, Validators.min(1)]],
      precoUnitario: [10.00, [Validators.required, Validators.min(0.01)]]
    });

    this.itensArray.push(itemGroup);
  }

  removerItem(index: number): void {
    if (this.itensControls.length > 1) {
      this.itensArray.removeAt(index);
    }
  }

  calcularSubtotalItem(index: number): number {
    const ctrl = this.itensControls[index];
    if (!ctrl) return 0;
    const qtd = Number(ctrl.get('quantidade')?.value) || 0;
    const preco = Number(ctrl.get('precoUnitario')?.value) || 0;
    return qtd * preco;
  }

  isItemFieldInvalid(index: number, field: string): boolean {
    const control = this.itensControls[index]?.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.invalid || this.itensControls.length === 0) {
      this.form.markAllAsTouched();
      const invalidFields: string[] = [];
      this.itensControls.forEach((ctrl, idx) => {
        const cod = ctrl.get('codigoProduto')?.value;
        if (!cod || String(cod).trim() === '') {
          invalidFields.push(`Item ${idx + 1}: selecione um produto`);
        }
        if ((Number(ctrl.get('quantidade')?.value) || 0) < 1) {
          invalidFields.push(`Item ${idx + 1}: quantidade mínima é 1`);
        }
        if ((Number(ctrl.get('precoUnitario')?.value) || 0) < 0.01) {
          invalidFields.push(`Item ${idx + 1}: preço unitário deve ser maior que zero`);
        }
      });
      const errorMsg = invalidFields.length > 0 ? invalidFields.join('\n') : 'Preencha todos os campos obrigatórios.';
      this.toastService.warning('Formulário Inválido', errorMsg);
      return;
    }

    this.isSubmitting.set(true);

    const request = {
      itens: this.itensControls.map(ctrl => {
        const codigo = String(ctrl.get('codigoProduto')?.value || '').trim();
        const preco = Number(ctrl.get('precoUnitario')?.value) || 0;
        const qtd = Number(ctrl.get('quantidade')?.value) || 1;
        return {
          codigo_produto: codigo,
          codigoProduto: codigo,
          quantidade: qtd,
          preco_unitario: preco,
          precoUnitario: preco
        };
      })
    };

    this.notaFiscalService.criarNotaFiscal(request).subscribe({
      next: (novaNota) => {
        this.isSubmitting.set(false);
        this.toastService.success(
          'Nota Fiscal Criada',
          `Nota Fiscal #${novaNota.id || novaNota.uuid} gerada com status "Aberta"!`
        );
        this.itensArray.clear();
        const defaultProd = this.produtos().length > 0 ? this.produtos()[0].codigo : '';
        this.adicionarItem(defaultProd);
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.produtoService.getProdutos().subscribe();
        this.notaCadastrada.emit();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}

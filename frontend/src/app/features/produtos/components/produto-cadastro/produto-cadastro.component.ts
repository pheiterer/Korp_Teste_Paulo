import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProdutoService } from '../../../../core/services/produto.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-produto-cadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="glass-card form-card">
      <div class="card-header">
        <div class="header-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          <h3>Cadastrar Produto</h3>
        </div>
        <p class="header-subtitle">Adicione novos itens ao catálogo e defina o saldo inicial de estoque.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="form-body">
        <!-- Código do Produto -->
        <div class="form-group">
          <label for="codigo" class="form-label">Código do Produto <span class="required">*</span></label>
          <input
            id="codigo"
            type="text"
            formControlName="codigo"
            placeholder="Ex: PROD-001"
            class="form-control"
            [class.invalid]="isFieldInvalid('codigo')"
          />
          @if (isFieldInvalid('codigo')) {
            <span class="error-msg">
              @if (form.get('codigo')?.hasError('required')) { Código é obrigatório. }
              @if (form.get('codigo')?.hasError('maxlength')) { Máximo de 50 caracteres. }
            </span>
          }
        </div>

        <!-- Descrição -->
        <div class="form-group">
          <label for="descricao" class="form-label">Descrição <span class="required">*</span></label>
          <input
            id="descricao"
            type="text"
            formControlName="descricao"
            placeholder="Ex: Parafuso Sextavado 3/8"
            class="form-control"
            [class.invalid]="isFieldInvalid('descricao')"
          />
          @if (isFieldInvalid('descricao')) {
            <span class="error-msg">
              @if (form.get('descricao')?.hasError('required')) { Descrição é obrigatória. }
              @if (form.get('descricao')?.hasError('maxlength')) { Máximo de 200 caracteres. }
            </span>
          }
        </div>

        <!-- Saldo Inicial -->
        <div class="form-group">
          <label for="saldo" class="form-label">Saldo Inicial <span class="required">*</span></label>
          <input
            id="saldo"
            type="number"
            formControlName="saldo"
            placeholder="0"
            min="0"
            class="form-control"
            [class.invalid]="isFieldInvalid('saldo')"
          />
          @if (isFieldInvalid('saldo')) {
            <span class="error-msg">
              @if (form.get('saldo')?.hasError('required')) { Saldo é obrigatório. }
              @if (form.get('saldo')?.hasError('min')) { O saldo não pode ser negativo. }
            </span>
          }
        </div>

        <!-- Ações -->
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-full" [disabled]="isSubmitting()">
            @if (isSubmitting()) {
              <span class="spinner"></span> Salvando...
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Cadastrar Produto
            }
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./produto-cadastro.component.scss']
})
export class ProdutoCadastroComponent {
  @Output() produtoCadastrado = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private produtoService = inject(ProdutoService);
  private toastService = inject(ToastService);

  readonly isSubmitting = signal(false);

  form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(50)]],
    descricao: ['', [Validators.required, Validators.maxLength(200)]],
    saldo: [0, [Validators.required, Validators.min(0)]]
  });

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.warning('Formulário Inválido', 'Preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.isSubmitting.set(true);
    const value = this.form.value;

    this.produtoService.criarProduto({
      codigo: (value.codigo || '').trim(),
      descricao: (value.descricao || '').trim(),
      saldoInicial: Math.floor(Number(value.saldo) || 0)
    }).subscribe({
      next: (novo) => {
        this.isSubmitting.set(false);
        this.toastService.success('Produto Cadastrado', `O produto "${novo.codigo}" foi adicionado com sucesso!`);
        this.form.reset({ saldo: 0 });
        this.produtoCadastrado.emit();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}

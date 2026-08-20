import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProdutoService } from '../../../../core/services/produto.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-produto-cadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './produto-cadastro.component.html',
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

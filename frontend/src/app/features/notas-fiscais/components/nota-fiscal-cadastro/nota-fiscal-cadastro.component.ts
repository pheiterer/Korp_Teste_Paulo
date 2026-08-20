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
  templateUrl: './nota-fiscal-cadastro.component.html',
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

  isProductSelectedInAnotherItem(codigo: string, currentIndex: number): boolean {
    if (!codigo) return false;
    const targetCode = String(codigo).trim().toUpperCase();
    return this.itensControls.some((ctrl, idx) => {
      if (idx === currentIndex) return false;
      const currentVal = String(ctrl.get('codigoProduto')?.value || '').trim().toUpperCase();
      return currentVal === targetCode;
    });
  }

  adicionarItem(codigo?: string): void {
    let defaultCodigo = codigo;
    if (!defaultCodigo || defaultCodigo === '') {
      const existingCodes = this.itensControls.map(c => String(c.get('codigoProduto')?.value || '').trim().toUpperCase());
      const availableProd = this.produtos().find(p => !existingCodes.includes(String(p.codigo).trim().toUpperCase()));
      defaultCodigo = availableProd ? availableProd.codigo : (this.produtos().length > 0 ? this.produtos()[0].codigo : '');
    }

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
      const seenCodes = new Set<string>();

      this.itensControls.forEach((ctrl, idx) => {
        const cod = String(ctrl.get('codigoProduto')?.value || '').trim();
        if (!cod) {
          invalidFields.push(`Item ${idx + 1}: selecione um produto`);
        } else {
          const upperCod = cod.toUpperCase();
          if (seenCodes.has(upperCod)) {
            invalidFields.push(`Item ${idx + 1}: produto duplicado na mesma nota`);
          }
          seenCodes.add(upperCod);
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

    // Double check duplicate items
    const codes = this.itensControls.map(c => String(c.get('codigoProduto')?.value || '').trim().toUpperCase());
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== codes.length) {
      this.toastService.warning('Produtos Duplicados', 'Não é permitido incluir o mesmo produto mais de uma vez na mesma nota fiscal.');
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

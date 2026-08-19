import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { NotaFiscalCadastroComponent } from './nota-fiscal-cadastro.component';
import { ToastService } from '../../../../core/services/toast.service';

registerLocaleData(localePt);

describe('NotaFiscalCadastroComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotaFiscalCadastroComponent],
      providers: [
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        ToastService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('deve inicializar com 1 item na lista de itens', () => {
    const fixture = TestBed.createComponent(NotaFiscalCadastroComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp.itensControls.length).toBe(1);
  });

  it('deve identificar se um produto já foi selecionado em outro item', () => {
    const fixture = TestBed.createComponent(NotaFiscalCadastroComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    comp.adicionarItem('PROD-01');
    comp.adicionarItem('PROD-02');

    // PROD-01 está no item 1, logo para o item 2 ele deve retornar true (já selecionado em outro item)
    expect(comp.isProductSelectedInAnotherItem('PROD-01', 2)).toBe(true);
    // Para o próprio item 1 onde ele foi selecionado, retorna false
    expect(comp.isProductSelectedInAnotherItem('PROD-01', 1)).toBe(false);
    // Para um produto que não está em nenhum item, retorna false
    expect(comp.isProductSelectedInAnotherItem('PROD-99', 0)).toBe(false);
  });
});

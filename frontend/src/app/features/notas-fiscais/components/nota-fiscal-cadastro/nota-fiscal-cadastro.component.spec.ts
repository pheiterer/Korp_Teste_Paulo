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
});

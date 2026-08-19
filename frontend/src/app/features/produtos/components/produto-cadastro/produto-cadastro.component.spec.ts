import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProdutoCadastroComponent } from './produto-cadastro.component';
import { ToastService } from '../../../../core/services/toast.service';

describe('ProdutoCadastroComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProdutoCadastroComponent],
      providers: [
        ToastService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('deve inicializar formulário com validadores', () => {
    const fixture = TestBed.createComponent(ProdutoCadastroComponent);
    const comp = fixture.componentInstance;
    expect(comp.form).toBeTruthy();
    expect(comp.form.get('codigo')?.valid).toBe(false);
  });
});

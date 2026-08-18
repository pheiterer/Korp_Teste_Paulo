import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
  });

  it('deve inicializar com lista de toasts vazia', () => {
    expect(service.toasts().length).toBe(0);
  });

  it('deve adicionar um toast de sucesso', () => {
    service.success('Título Teste', 'Mensagem de Sucesso', 'cid-123');
    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].title).toBe('Título Teste');
    expect(toasts[0].correlationId).toBe('cid-123');
  });

  it('deve remover um toast pelo ID', () => {
    service.info('Info', 'Mensagem Info');
    const id = service.toasts()[0].id;
    service.remove(id);
    expect(service.toasts().length).toBe(0);
  });
});

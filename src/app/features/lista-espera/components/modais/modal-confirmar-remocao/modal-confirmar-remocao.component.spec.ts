import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalConfirmarRemocaoComponent } from './modal-confirmar-remocao.component';

describe('ModalConfirmarRemocaoComponent', () => {
  let component: ModalConfirmarRemocaoComponent;
  let fixture: ComponentFixture<ModalConfirmarRemocaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalConfirmarRemocaoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalConfirmarRemocaoComponent);
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('clienteNome', 'Cliente Teste');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o nome do cliente no corpo do modal', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Cliente Teste');
  });

  it('deve emitir confirmar ao confirmar e cancelar ao fechar', () => {
    let confirmado = false;
    let cancelado = false;
    component.confirmar.subscribe(() => (confirmado = true));
    component.cancelar.subscribe(() => (cancelado = true));

    component.confirmar.emit();
    component.cancelar.emit();

    expect(confirmado).toBeTrue();
    expect(cancelado).toBeTrue();
  });
});

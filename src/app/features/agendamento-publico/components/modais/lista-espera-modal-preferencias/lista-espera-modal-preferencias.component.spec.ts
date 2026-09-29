import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ListaEsperaModalPreferenciasComponent, horaJanelaValida } from './lista-espera-modal-preferencias.component';
import { FormControl } from '@angular/forms';

describe('ListaEsperaModalPreferenciasComponent', () => {
  let component: ListaEsperaModalPreferenciasComponent;
  let fixture: ComponentFixture<ListaEsperaModalPreferenciasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaEsperaModalPreferenciasComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaEsperaModalPreferenciasComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve emitir payload com preferências parciais (null quando vazio)', () => {
    let payload: unknown = null;
    component.confirm.subscribe((p) => (payload = p));

    component.form.controls.servicoId.setValue('guid-servico');
    component.confirmar();

    expect(payload).toEqual({
      servicoId: 'guid-servico',
      profissionalId: null,
      horaJanelaInicio: null,
    });
  });

  it('não deve emitir quando a janela informada já passou', () => {
    let emitido = false;
    component.confirm.subscribe(() => (emitido = true));

    const agora = new Date();
    const horaPassada = `${String(agora.getHours()).padStart(2, '0')}:${String(Math.max(agora.getMinutes() - 1, 0)).padStart(2, '0')}`;
    component.form.controls.horaJanelaInicio.setValue(horaPassada);

    component.confirmar();

    expect(component.form.invalid).toBeTrue();
    expect(emitido).toBeFalse();
  });
});

describe('horaJanelaValida', () => {
  const control = new FormControl<string>('');

  it('aceita campo vazio (opcional)', () => {
    control.setValue('');
    expect(horaJanelaValida()(control)).toBeNull();
  });

  it('rejeita horário no passado', () => {
    const agora = new Date();
    const passado = new Date(agora.getTime() - 60 * 60 * 1000);
    const hhmm = `${String(passado.getHours()).padStart(2, '0')}:${String(passado.getMinutes()).padStart(2, '0')}`;
    control.setValue(hhmm);
    expect(horaJanelaValida()(control)).toEqual({ horaPassada: true });
  });

  it('aceita horário futuro', () => {
    const agora = new Date();
    const futuro = new Date(agora.getTime() + 60 * 60 * 1000);
    const hhmm = `${String(futuro.getHours()).padStart(2, '0')}:${String(futuro.getMinutes()).padStart(2, '0')}`;
    control.setValue(hhmm);
    expect(horaJanelaValida()(control)).toBeNull();
  });
});

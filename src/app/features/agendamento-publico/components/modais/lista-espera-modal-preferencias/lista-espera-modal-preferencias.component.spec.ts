import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  ListaEsperaModalPreferenciasComponent,
} from './lista-espera-modal-preferencias.component';
import { EntrarListaEsperaPayload } from '../../../../../core/models/lista-espera/lista-espera.model';

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
    let emitido: EntrarListaEsperaPayload | null = null;
    component.confirm.subscribe((p) => (emitido = p));
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();

    component.confirmar();

    expect(emitido!).toEqual({
      servicoId: null,
      profissionalId: null,
      horaJanelaInicio: null,
    });
  });

  it('deve carregar a janela do preset (slot ocupado clicado — RN-074) como default do campo "a partir de que horas"', () => {
    let emitido: EntrarListaEsperaPayload | null = null;
    component.confirm.subscribe((p) => (emitido = p));
    fixture.componentRef.setInput('preset', {
      servicoId: 'svc-1',
      profissionalId: 'prof-1',
      horaJanelaInicio: '14:00',
    });
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();

    expect(component.form.controls.horaJanelaInicio.value).toBe('14:00');

    component.confirmar();

    expect(emitido!).toEqual({
      servicoId: 'svc-1',
      profissionalId: 'prof-1',
      horaJanelaInicio: '14:00',
    });
  });

  it('deve enviar a janela informada no campo "a partir de que horas" quando o preset não traz hora', () => {
    let emitido: EntrarListaEsperaPayload | null = null;
    component.confirm.subscribe((p) => (emitido = p));
    fixture.componentRef.setInput('preset', null);
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();

    component.form.controls.horaJanelaInicio.setValue('15:30');
    component.confirmar();

    expect(emitido!).toEqual({
      servicoId: null,
      profissionalId: null,
      horaJanelaInicio: '15:30',
    });
  });

  // RN-074 — modo slot clicado: janela início+fim delimita o horário exato; o fim usa a
  // duração do serviço selecionado no modal (fallback 30 min quando serviço é "qualquer").
  it('deve emitir janela inicio+fim do horário específico quando horaEspecifica está ativa', () => {
    let emitido: EntrarListaEsperaPayload | null = null;
    component.confirm.subscribe((p) => (emitido = p));
    fixture.componentRef.setInput('preset', { servicoId: 'svc-1' });
    fixture.componentRef.setInput('horaEspecifica', '14:00');
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();

    component['_servicos'].set([
      { id: 'svc-1', nome: 'Corte', preco: 50, duracao: 60 },
    ]);
    component.confirmar();

    expect(emitido!).toEqual({
      servicoId: 'svc-1',
      profissionalId: null,
      horaJanelaInicio: '14:00',
      horaJanelaFim: '15:00',
    });
  });

  // RN-074 — modo slot: mesmo que o form carregue preset de janela (ex.: reabertura),
  // o payload usa o horário específico clicado — o campo não é editável nesse modo.
  it('deve ignorar a janela do form no modo slot específico', () => {
    let emitido: EntrarListaEsperaPayload | null = null;
    component.confirm.subscribe((p) => (emitido = p));
    fixture.componentRef.setInput('preset', { horaJanelaInicio: '09:00' });
    fixture.componentRef.setInput('horaEspecifica', '14:00');
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();

    component.confirmar();

    expect(emitido!).toEqual({
      servicoId: null,
      profissionalId: null,
      horaJanelaInicio: '14:00',
      horaJanelaFim: '14:30',
    });
  });
});

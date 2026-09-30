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

  it('deve carregar a janela do preset (slot ocupado clicado — RN-074) mesmo sem campo no form', () => {
    let emitido: EntrarListaEsperaPayload | null = null;
    component.confirm.subscribe((p) => (emitido = p));
    fixture.componentRef.setInput('preset', {
      servicoId: 'svc-1',
      profissionalId: 'prof-1',
      horaJanelaInicio: '14:00',
    });
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();

    component.confirmar();

    expect(emitido!).toEqual({
      servicoId: 'svc-1',
      profissionalId: 'prof-1',
      horaJanelaInicio: '14:00',
    });
  });
});

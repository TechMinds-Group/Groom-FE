import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JornadaFormModalComponent } from './jornada-form-modal.component';
import {
  CriarJornadaEspecialCommand,
  JornadaEspecial,
} from '../../../../../core/models/configuracoes/jornada-especial.model';
import { ProfissionalOpcao } from '../../../models/jornada-especial-config.model';

describe('JornadaFormModalComponent', () => {
  let component: JornadaFormModalComponent;
  let fixture: ComponentFixture<JornadaFormModalComponent>;

  const profissionais: ProfissionalOpcao[] = [
    { id: 'prof-1', nome: 'Ana Souza' },
    { id: 'prof-2', nome: 'Bruno Lima' },
  ];

  const jornadaEmEdicao: JornadaEspecial = {
    id: 'jornada-1',
    profissionalId: 'prof-1',
    nomeProfissional: 'Ana Souza',
    titulo: 'Reunião interna',
    dataInicio: '2026-12-05T00:00:00Z',
    dataFim: '2026-12-06T00:00:00Z',
    horaAbertura: '09:00',
    horaFechamento: '17:00',
    temIntervalo: true,
    intervaloInicio: '12:00',
    intervaloFim: '13:00',
    ativo: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JornadaFormModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JornadaFormModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profissionais', profissionais);
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();
  });

  /** Captura o payload emitido pelo output `salvar`. */
  function emitirSalvar(): CriarJornadaEspecialCommand[] {
    const emitidos: CriarJornadaEspecialCommand[] = [];
    component.salvar.subscribe((comando) => emitidos.push(comando));
    component['aoSalvar']();
    return emitidos;
  }

  it('should create em modo criação com formulário limpo', () => {
    expect(component).toBeTruthy();
    expect(component.form.controls.titulo.value).toBe('');
    expect(component.form.controls.profissionalId.value).toBe('');
    expect(component.form.controls.horaAbertura.value).toBe('');
    expect(component.form.controls.horaFechamento.value).toBe('');
  });

  it('deve preencher os campos ao abrir em modo edição (RN-147-2)', () => {
    fixture.componentRef.setInput('jornada', jornadaEmEdicao);
    fixture.detectChanges();

    expect(component.form.controls.titulo.value).toBe('Reunião interna');
    expect(component.form.controls.profissionalId.value).toBe('prof-1');
    expect(component.form.controls.dataInicio.value).toBe('2026-12-05');
    expect(component.form.controls.dataFim.value).toBe('2026-12-06');
    expect(component.form.controls.horaAbertura.value).toBe('09:00');
    expect(component.form.controls.horaFechamento.value).toBe('17:00');
    expect(component.form.controls.temIntervalo.value).toBeTrue();
    expect(component.form.controls.intervaloInicio.value).toBe('12:00');
    expect(component.form.controls.intervaloFim.value).toBe('13:00');
  });

  it('deve bloquear o salvamento sem título e indicar o campo (RN-147-2)', () => {
    component.form.controls.titulo.setValue('');

    const emitidos = emitirSalvar();

    expect(emitidos.length).toBe(0);
    expect(component.form.controls.titulo.touched).toBeTrue();
    expect(component.form.controls.titulo.invalid).toBeTrue();
  });

  it('deve bloquear fechamento anterior à abertura com erro claro (RN-111)', () => {
    component.form.controls.titulo.setValue('Jornada válida');
    component.form.controls.dataInicio.setValue('2026-12-05');
    component.form.controls.dataFim.setValue('2026-12-05');
    component.form.controls.horaAbertura.setValue('10:00');
    component.form.controls.horaFechamento.setValue('08:00');

    const emitidos = emitirSalvar();

    expect(emitidos.length).toBe(0);
    expect(component.form.hasError('horarioInvalido')).toBeTrue();
  });

  it('deve bloquear data fim anterior à data início (fim ≥ início — RN-111)', () => {
    component.form.controls.titulo.setValue('Jornada válida');
    component.form.controls.dataInicio.setValue('2026-12-06');
    component.form.controls.dataFim.setValue('2026-12-05');

    const emitidos = emitirSalvar();

    expect(emitidos.length).toBe(0);
    expect(component.form.hasError('periodoInvalido')).toBeTrue();
  });

  it('deve aplicar os defaults 08:00–18:00 quando os horários ficam vazios (RN-111)', () => {
    component.form.controls.titulo.setValue('Jornada padrão');
    component.form.controls.dataInicio.setValue('2026-12-05');
    component.form.controls.dataFim.setValue('2026-12-05');

    const emitidos = emitirSalvar();

    expect(emitidos.length).toBe(1);
    expect(emitidos[0].horaAbertura).toBe('08:00');
    expect(emitidos[0].horaFechamento).toBe('18:00');
  });

  it('deve emitir o escopo do profissional selecionado (RN-111)', () => {
    component.form.controls.titulo.setValue('Folga do profissional');
    component.form.controls.profissionalId.setValue('prof-2');
    component.form.controls.dataInicio.setValue('2026-12-05');
    component.form.controls.dataFim.setValue('2026-12-05');

    const emitidos = emitirSalvar();

    expect(emitidos.length).toBe(1);
    expect(emitidos[0].profissionalId).toBe('prof-2');
  });

  it('deve emitir escopo do estabelecimento (null) e intervalos nulos quando sem intervalo (RN-111)', () => {
    component.form.controls.titulo.setValue('Exceção do estabelecimento');
    component.form.controls.dataInicio.setValue('2026-12-05');
    component.form.controls.dataFim.setValue('2026-12-05');
    component.form.controls.temIntervalo.setValue(false);

    const emitidos = emitirSalvar();

    expect(emitidos.length).toBe(1);
    expect(emitidos[0].profissionalId).toBeNull();
    expect(emitidos[0].temIntervalo).toBeFalse();
    expect(emitidos[0].intervaloInicio).toBeNull();
    expect(emitidos[0].intervaloFim).toBeNull();
  });

  it('deve emitir os intervalos quando temIntervalo está marcado (RN-111)', () => {
    component.form.controls.titulo.setValue('Jornada com pausa');
    component.form.controls.dataInicio.setValue('2026-12-05');
    component.form.controls.dataFim.setValue('2026-12-05');
    component.form.controls.horaAbertura.setValue('08:00');
    component.form.controls.horaFechamento.setValue('18:00');
    component.form.controls.temIntervalo.setValue(true);
    component.form.controls.intervaloInicio.setValue('12:00');
    component.form.controls.intervaloFim.setValue('13:00');

    const emitidos = emitirSalvar();

    expect(emitidos.length).toBe(1);
    expect(emitidos[0].temIntervalo).toBeTrue();
    expect(emitidos[0].intervaloInicio).toBe('12:00');
    expect(emitidos[0].intervaloFim).toBe('13:00');
  });
});

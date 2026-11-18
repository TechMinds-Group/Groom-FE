import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JornadaExcluirModalComponent } from './jornada-excluir-modal.component';
import { JornadaEspecial } from '../../../../../core/models/configuracoes/jornada-especial.model';

describe('JornadaExcluirModalComponent', () => {
  let component: JornadaExcluirModalComponent;
  let fixture: ComponentFixture<JornadaExcluirModalComponent>;

  const jornadaFake: JornadaEspecial = {
    id: 'jornada-1',
    profissionalId: null,
    nomeProfissional: null,
    titulo: 'Reunião interna',
    dataInicio: '2026-12-05T00:00:00Z',
    dataFim: '2026-12-05T00:00:00Z',
    horaAbertura: '08:00',
    horaFechamento: '18:00',
    temIntervalo: false,
    intervaloInicio: null,
    intervaloFim: null,
    ativo: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JornadaExcluirModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JornadaExcluirModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('show', true);
    fixture.componentRef.setInput('jornada', jornadaFake);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o título da jornada a excluir (RN-147-3)', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reunião interna');
  });

  it('deve exibir o erro da API sem fechar o modal quando a exclusão falha (RN-147-3)', () => {
    fixture.componentRef.setInput('erro', 'Não foi possível excluir a jornada especial.');
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Não foi possível excluir a jornada especial.');
    expect(component.show()).toBeTrue();
  });
});

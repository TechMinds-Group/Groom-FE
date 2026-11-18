import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { JornadaEspecialComponent } from './jornada-especial.component';
import {
  CriarJornadaEspecialCommand,
  JornadaEspecial,
} from '../../../../core/models/configuracoes/jornada-especial.model';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { Usuario } from '../../../../core/models/gestao-usuarios/usuario.model';
import { TmToastService } from '@techminds-group/tm-angular-lib';

/** Fake do serviço de usuários para o filtro de escopo por profissional (sem HTTP). */
class GestaoUsuariosServiceFake {
  readonly usuarios = signal<Usuario[]>([profissionalFake]);
  async carregarUsuarios(): Promise<void> {}
}

const profissionalFake: Usuario = {
  id: 'prof-1',
  nome: 'Ana',
  sobrenome: 'Souza',
  email: 'ana@groom.com',
  perfil: 'Profissional',
  perfilCorHex: '#000000',
  perfilIconeClass: 'fas fa-user-tie',
  status: 'Ativo',
};

function jornadaFake(dados: Partial<JornadaEspecial>): JornadaEspecial {
  return {
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
    ...dados,
  };
}

describe('JornadaEspecialComponent', () => {
  let component: JornadaEspecialComponent;
  let fixture: ComponentFixture<JornadaEspecialComponent>;
  let httpMock: HttpTestingController;
  let toastSpy: jasmine.SpyObj<TmToastService>;

  const listaFake: JornadaEspecial[] = [
    jornadaFake({ id: 'jornada-1', titulo: 'Reunião interna', profissionalId: null, nomeProfissional: null }),
    jornadaFake({
      id: 'jornada-2',
      titulo: 'Folga da Ana',
      profissionalId: 'prof-1',
      nomeProfissional: 'Ana Souza',
      horaAbertura: '09:00',
      horaFechamento: '13:00',
    }),
  ];

  beforeEach(async () => {
    toastSpy = jasmine.createSpyObj('TmToastService', ['success', 'error', 'info', 'warning']);

    await TestBed.configureTestingModule({
      imports: [JornadaEspecialComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TmToastService, useValue: toastSpy },
        { provide: GestaoUsuariosService, useClass: GestaoUsuariosServiceFake },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JornadaEspecialComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Dispara o ngOnInit (detectChanges) e resolve o GET da listagem. */
  function boot(jornadas: JornadaEspecial[]): void {
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.endsWith('/jornadas-especiais'))
      .flush(jornadas);
    tick();
    fixture.detectChanges();
  }

  it('should create e carregar a listagem com datas e horários legíveis (RN-147-1)', fakeAsync(() => {
    boot(listaFake);

    expect(component).toBeTruthy();
    expect(component.jornadas().length).toBe(2);
    expect(component.jornadasFiltradas().length).toBe(2);
    expect(component.profissionais().length).toBe(1);
    expect(component.profissionais()[0].nome).toBe('Ana Souza');
  }));

  it('deve filtrar em memória pelo escopo estabelecimento (RN-147-1)', fakeAsync(() => {
    boot(listaFake);

    component.filtroEscopo.set('estabelecimento');

    expect(component.jornadasFiltradas().length).toBe(1);
    expect(component.jornadasFiltradas()[0].id).toBe('jornada-1');
  }));

  it('deve filtrar em memória pelo escopo de um profissional (RN-147-1)', fakeAsync(() => {
    boot(listaFake);

    component.filtroEscopo.set('prof-1');

    expect(component.jornadasFiltradas().length).toBe(1);
    expect(component.jornadasFiltradas()[0].id).toBe('jornada-2');
  }));

  it('deve abrir o modal de criação limpo e o de edição com a jornada selecionada (RN-147-2)', fakeAsync(() => {
    boot(listaFake);

    component.abrirCriacao();
    expect(component.modalFormAberto()).toBeTrue();
    expect(component.jornadaSelecionada()).toBeNull();

    component.abrirEdicao(listaFake[1]);
    expect(component.jornadaSelecionada()?.id).toBe('jornada-2');

    component.fecharFormulario();
    expect(component.modalFormAberto()).toBeFalse();
    expect(component.erroFormulario()).toBe('');
  }));

  it('deve criar jornada, fechar o modal e recarregar a listagem (RN-147-2)', fakeAsync(() => {
    boot(listaFake);

    const comando: CriarJornadaEspecialCommand = {
      profissionalId: null,
      titulo: 'Evento local',
      dataInicio: '2026-12-10',
      dataFim: '2026-12-10',
      horaAbertura: '08:00',
      horaFechamento: '18:00',
      temIntervalo: false,
      intervaloInicio: null,
      intervaloFim: null,
    };

    component.aoSalvarFormulario(comando);

    const postReq = httpMock.expectOne((r) => r.method === 'POST' && r.url.endsWith('/jornadas-especiais'));
    postReq.flush(jornadaFake({ id: 'jornada-3', titulo: 'Evento local' }));
    tick();

    // Recarga da listagem após o sucesso
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.endsWith('/jornadas-especiais'))
      .flush([...listaFake, jornadaFake({ id: 'jornada-3', titulo: 'Evento local' })]);
    tick();
    fixture.detectChanges();

    expect(component.jornadas().length).toBe(3);
    expect(component.modalFormAberto()).toBeFalse();
    expect(toastSpy.success).toHaveBeenCalled();
  }));

  it('deve atualizar a jornada preservando o flag ativo (RN-147-2)', fakeAsync(() => {
    boot(listaFake);

    const comando: CriarJornadaEspecialCommand = {
      profissionalId: 'prof-1',
      titulo: 'Folga da Ana alterada',
      dataInicio: '2026-12-11',
      dataFim: '2026-12-11',
      horaAbertura: '09:00',
      horaFechamento: '13:00',
      temIntervalo: false,
      intervaloInicio: null,
      intervaloFim: null,
    };

    component.abrirEdicao(listaFake[1]);
    component.aoSalvarFormulario(comando);

    const putReq = httpMock.expectOne(
      (r) => r.method === 'PUT' && r.url.endsWith('/jornadas-especiais/jornada-2'),
    );
    expect(putReq.request.body.ativo).toBeTrue();
    expect(putReq.request.body.id).toBe('jornada-2');
    putReq.flush({ ...listaFake[1], titulo: 'Folga da Ana alterada' });
    tick();

    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.endsWith('/jornadas-especiais'))
      .flush(listaFake);
    tick();

    expect(toastSpy.success).toHaveBeenCalled();
    expect(component.modalFormAberto()).toBeFalse();
  }));

  it('deve exibir o erro Jornada.DataInvalida no formulário sem perder os dados (RN-147-2)', fakeAsync(() => {
    boot(listaFake);

    const comando: CriarJornadaEspecialCommand = {
      profissionalId: null,
      titulo: 'Período inválido',
      dataInicio: '2026-12-10',
      dataFim: '2026-12-09',
      horaAbertura: '08:00',
      horaFechamento: '18:00',
      temIntervalo: false,
      intervaloInicio: null,
      intervaloFim: null,
    };

    component.abrirCriacao();
    component.aoSalvarFormulario(comando);

    const postReq = httpMock.expectOne((r) => r.method === 'POST' && r.url.endsWith('/jornadas-especiais'));
    postReq.flush({ erro: 'Jornada.DataInvalida' }, { status: 422, statusText: 'Unprocessable Entity' });
    tick();
    fixture.detectChanges();

    expect(component.erroFormulario()).toBe('Jornada.DataInvalida');
    expect(component.modalFormAberto()).toBeTrue();
    expect(toastSpy.success).not.toHaveBeenCalled();
  }));

  it('deve remover a jornada confirmada e tirar o item da listagem (RN-147-3)', fakeAsync(() => {
    boot(listaFake);

    component.solicitarExclusao(listaFake[1]);
    expect(component.modalExcluirAberto()).toBeTrue();

    component.confirmarExclusao();

    const deleteReq = httpMock.expectOne(
      (r) => r.method === 'DELETE' && r.url.endsWith('/jornadas-especiais/jornada-2'),
    );
    deleteReq.flush(null);
    tick();

    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.endsWith('/jornadas-especiais'))
      .flush([listaFake[0]]);
    tick();
    fixture.detectChanges();

    expect(component.jornadas().length).toBe(1);
    expect(component.modalExcluirAberto()).toBeFalse();
    expect(toastSpy.success).toHaveBeenCalled();
  }));

  it('deve exibir o erro e manter o item na listagem quando a exclusão falha (RN-147-3)', fakeAsync(() => {
    boot(listaFake);

    component.solicitarExclusao(listaFake[0]);
    component.confirmarExclusao();

    const deleteReq = httpMock.expectOne(
      (r) => r.method === 'DELETE' && r.url.endsWith('/jornadas-especiais/jornada-1'),
    );
    deleteReq.flush({ erro: 'Falha ao remover a jornada.' }, { status: 500, statusText: 'Internal Server Error' });
    tick();
    fixture.detectChanges();

    expect(component.erroExclusao()).toBe('Falha ao remover a jornada.');
    expect(component.modalExcluirAberto()).toBeTrue();
    expect(component.jornadas().length).toBe(2);
    expect(component.jornadasFiltradas()[0].id).toBe('jornada-1');
  }));
});

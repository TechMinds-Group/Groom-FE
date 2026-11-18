import { TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { JornadaEspecialService } from './jornada-especial.service';
import {
  JornadaEspecial,
  CriarJornadaEspecialCommand,
  AtualizarJornadaEspecialCommand,
} from '../models/configuracoes/jornada-especial.model';

describe('JornadaEspecialService', () => {
  let service: JornadaEspecialService;
  let httpMock: HttpTestingController;

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(JornadaEspecialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve listar jornadas com os parâmetros início e fim (RN-147-1)', fakeAsync(() => {
    let resultado: JornadaEspecial[] | undefined;

    service.listarJornadas('2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z').then((r) => (resultado = r));

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.endsWith('/jornadas-especiais'));
    expect(req.request.params.get('inicio')).toBe('2026-01-01T00:00:00Z');
    expect(req.request.params.get('fim')).toBe('2026-12-31T23:59:59Z');
    expect(req.request.params.get('profissionalId')).toBeNull();
    req.flush([jornadaFake]);
    tick();

    expect(resultado).toEqual([jornadaFake]);
  }));

  it('deve incluir profissionalId na listagem quando informado (RN-111)', fakeAsync(() => {
    let resultado: JornadaEspecial[] | undefined;

    service
      .listarJornadas('2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z', 'prof-1')
      .then((r) => (resultado = r));

    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.endsWith('/jornadas-especiais'));
    expect(req.request.params.get('profissionalId')).toBe('prof-1');
    req.flush([]);
    tick();

    expect(resultado).toEqual([]);
  }));

  it('deve criar jornada via POST com o payload do comando (RN-147-2)', fakeAsync(() => {
    let resultado: JornadaEspecial | undefined;
    const comando: CriarJornadaEspecialCommand = {
      profissionalId: null,
      titulo: 'Reunião interna',
      dataInicio: '2026-12-05T00:00:00Z',
      dataFim: '2026-12-05T00:00:00Z',
      horaAbertura: '08:00',
      horaFechamento: '18:00',
      temIntervalo: false,
      intervaloInicio: null,
      intervaloFim: null,
    };

    service.criarJornada(comando).then((r) => (resultado = r));

    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url.endsWith('/jornadas-especiais'));
    expect(req.request.body).toEqual(comando);
    req.flush(jornadaFake);
    tick();

    expect(resultado).toEqual(jornadaFake);
  }));

  it('deve atualizar jornada via PUT /:id (RN-147-2)', fakeAsync(() => {
    let resultado: JornadaEspecial | undefined;
    const comando: AtualizarJornadaEspecialCommand = {
      id: 'jornada-1',
      profissionalId: null,
      titulo: 'Reunião interna alterada',
      dataInicio: '2026-12-05T00:00:00Z',
      dataFim: '2026-12-06T00:00:00Z',
      horaAbertura: '09:00',
      horaFechamento: '17:00',
      temIntervalo: true,
      intervaloInicio: '12:00',
      intervaloFim: '13:00',
      ativo: true,
    };

    service.atualizarJornada(comando).then((r) => (resultado = r));

    const req = httpMock.expectOne(
      (r) => r.method === 'PUT' && r.url.endsWith('/jornadas-especiais/jornada-1'),
    );
    expect(req.request.body).toEqual(comando);
    req.flush({ ...jornadaFake, titulo: 'Reunião interna alterada' });
    tick();

    expect(resultado?.titulo).toBe('Reunião interna alterada');
  }));

  it('deve remover jornada via DELETE /:id (RN-147-3)', fakeAsync(() => {
    let concluido = false;

    service.removerJornada('jornada-1').then(() => (concluido = true));

    const req = httpMock.expectOne(
      (r) => r.method === 'DELETE' && r.url.endsWith('/jornadas-especiais/jornada-1'),
    );
    req.flush(null);
    tick();

    expect(concluido).toBeTrue();
  }));
});

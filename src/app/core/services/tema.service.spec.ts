import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TemaService } from './tema.service';
import { TemaGravacao, TemaLeitura } from '../models/tema/tema.model';

/** RN-098-11 — regressão do serviço de API do tema (API_CONTRACTS §19). */
describe('TemaService', () => {
  let service: TemaService;
  let httpMock: HttpTestingController;

  const tema: TemaLeitura = {
    configurado: true,
    modoPaleta: 'Unica',
    primaria: '#2563EB',
    secundaria: '#1E40AF',
    acento: '#F59E0B',
    fundo: '#FFFFFF',
    texto: '#1F2937',
    escuroPrimaria: null,
    escuroSecundaria: null,
    escuroAcento: null,
    escuroFundo: null,
    escuroTexto: null,
    logoUrl: 'https://exemplo.com/logo.png',
    fonteTitulo: null,
    fonteCorpo: null,
    gradientes: { fundo: { cor1: '#FFFFFF', cor2: '#F8FAFC', direcao: 'vertical' } },
    tokens: null,
    atualizadoEm: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TemaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('obterTema deve chamar GET api/tema com header que suprime o toast global', async () => {
    const promise = service.obterTema();
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/tema'));
    expect(req.request.headers.get('X-Skip-Error-Toast')).toBe('true');
    req.flush(tema);
    await expectAsync(promise).toBeResolvedTo(tema);
  });

  it('obterTemaPublico deve chamar GET api/publico/{estabelecimento}/tema (anônimo)', async () => {
    const promise = service.obterTemaPublico('barbearia-demo');
    const req = httpMock.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/publico/barbearia-demo/tema'));
    expect(req.request.headers.has('X-Tenant-Id')).toBeFalse();
    req.flush(tema);
    await expectAsync(promise).toBeResolvedTo(tema);
  });

  it('salvarTema deve chamar PUT api/tema com o payload de gravação', async () => {
    const payload: TemaGravacao = {
      modoPaleta: 'Unica',
      primaria: '#2563EB',
      secundaria: '#1E40AF',
      acento: '#F59E0B',
      fundo: '#FFFFFF',
      texto: '#1F2937',
      escuroPrimaria: null,
      escuroSecundaria: null,
      escuroAcento: null,
      escuroFundo: null,
      escuroTexto: null,
      logoUrl: null,
      fonteTitulo: null,
      fonteCorpo: null,
      gradientes: null,
      tokens: null,
    };
    const promise = service.salvarTema(payload);
    const req = httpMock.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/tema'));
    expect(req.request.body).toEqual(payload);
    req.flush(tema);
    await expectAsync(promise).toBeResolvedTo(tema);
  });

  it('restaurarPadrao deve chamar DELETE api/tema (204 idempotente)', async () => {
    const promise = service.restaurarPadrao();
    const req = httpMock.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/api/tema'));
    req.flush(null, { status: 204, statusText: 'No Content' });
    await expectAsync(promise).toBeResolved();
  });

  it('gerarModoOposto deve chamar POST api/tema/gerar-modo-oposto com a origem (RN-102)', async () => {
    const promise = service.gerarModoOposto('claro');
    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/tema/gerar-modo-oposto'));
    expect(req.request.body).toEqual({ origem: 'claro' });
    req.flush({
      modo: 'escuro',
      primaria: '#3B82F6',
      secundaria: '#1D4ED8',
      acento: '#FBBF24',
      fundo: '#0F172A',
      texto: '#F8FAFC',
      gradientes: null,
    });
    const resposta = await promise;
    expect(resposta.modo).toBe('escuro');
  });
});
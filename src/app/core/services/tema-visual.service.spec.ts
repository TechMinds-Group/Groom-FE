import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TemaVisualService } from './tema-visual.service';
import { TemaLeitura } from '../models/tema/tema.model';

/** RN-098-7 — aplicação runtime do tema via CSS custom properties (RN-098/099/100, CR-001). */
describe('TemaVisualService', () => {
  let service: TemaVisualService;
  let httpMock: HttpTestingController;

  const temaUnica: TemaLeitura = {
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
    fonteTitulo: 'Montserrat',
    fonteCorpo: 'Inter',
    gradientes: { fundo: { cor1: '#FFFFFF', cor2: '#F8FAFC', direcao: 'vertical' } },
    tokens: null,
    atualizadoEm: null,
  };

  const temaPorModo: TemaLeitura = {
    ...temaUnica,
    modoPaleta: 'PorModo',
    gradientes: null,
    escuroPrimaria: '#0B5ED7',
    escuroSecundaria: '#495057',
    escuroAcento: '#FBBF24',
    escuroFundo: '#0F172A',
    escuroTexto: '#F8FAFC',
  };

  const temaPadrao: TemaLeitura = {
    configurado: false,
    modoPaleta: null,
    primaria: null,
    secundaria: null,
    acento: null,
    fundo: null,
    texto: null,
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
    atualizadoEm: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TemaVisualService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('deve montar linear-gradient do slot com gradiente (CR-001)', () => {
    const variaveis = service.mapearVariaveis(temaUnica, false);
    expect(variaveis['--tema-fundo']).toBe('linear-gradient(180deg, #FFFFFF, #F8FAFC)');
  });

  it('deve aplicar cor sólida nos slots sem gradiente e fontes/logo do tema', () => {
    const variaveis = service.mapearVariaveis({ ...temaUnica, gradientes: null }, false);
    expect(variaveis['--tema-primaria']).toBe('#2563EB');
    expect(variaveis['--tema-texto']).toBe('#1F2937');
    expect(variaveis['--tema-fonte-titulo']).toBe('Montserrat');
    expect(variaveis['--tema-logo-url']).toBe('url("https://exemplo.com/logo.png")');
  });

  it('em Unica deve usar a paleta base mesmo no modo escuro (RN-099)', () => {
    const variaveis = service.mapearVariaveis(temaUnica, true);
    expect(variaveis['--tema-fundo']).toBe('linear-gradient(180deg, #FFFFFF, #F8FAFC)');
  });

  it('em PorModo com modo escuro deve aplicar as cores escuro* (RN-099)', () => {
    const variaveis = service.mapearVariaveis(temaPorModo, true);
    expect(variaveis['--tema-fundo']).toBe('#0F172A');
    expect(variaveis['--tema-texto']).toBe('#F8FAFC');
    expect(variaveis['--tema-primaria']).toBe('#0B5ED7');
  });

  it('em PorModo com modo claro deve aplicar a paleta base (RN-099)', () => {
    const variaveis = service.mapearVariaveis(temaPorModo, false);
    expect(variaveis['--tema-fundo']).toBe('#FFFFFF');
  });

  it('com configurado: false deve remover as variáveis — fallback RN-100', () => {
    const variaveis = service.mapearVariaveis(temaPadrao, false);
    expect(variaveis['--tema-primaria']).toBeNull();
    expect(variaveis['--tema-fundo']).toBeNull();
    expect(variaveis['--tema-logo-url']).toBeNull();
    expect(variaveis['--tm-primary']).toBeNull();
  });

  it('com payload null deve remover as variáveis (padrão do sistema)', () => {
    const variaveis = service.mapearVariaveis(null, false);
    expect(variaveis['--tema-primaria']).toBeNull();
  });

  it('aplicarEmElemento deve setar/remover propriedades no elemento', () => {
    const elemento = document.createElement('div');
    service.aplicarEmElemento(elemento, { '--tema-primaria': '#123456', '--tema-texto': null });
    expect(elemento.style.getPropertyValue('--tema-primaria')).toBe('#123456');
    expect(elemento.style.getPropertyValue('--tema-texto')).toBe('');
  });

  it('carregarAplicar deve aplicar o tema carregado (painel — RN-098-7)', async () => {
    const promise = service.carregarAplicar();
    httpMock.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/tema')).flush(temaUnica);
    await promise;
    expect(service.configurado()).toBeTrue();
    expect(service.logoUrl()).toBe('https://exemplo.com/logo.png');
  });

  it('carregarAplicarPublico deve aplicar o tema por slug (portal — RN-098-7)', async () => {
    const promise = service.carregarAplicarPublico('barbearia-demo');
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/publico/barbearia-demo/tema'))
      .flush(temaPorModo);
    await promise;
    expect(service.configurado()).toBeTrue();
  });

  it('carregarAplicar em falha mantém o padrão (fallback RN-100, sem erro)', async () => {
    const promise = service.carregarAplicar();
    httpMock
      .expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/tema'))
      .flush('erro', { status: 500, statusText: 'Server Error' });
    await expectAsync(promise).toBeResolved();
    expect(service.configurado()).toBeFalse();
  });

  it('montarLinearGradient deve mapear as três direções (CR-001)', () => {
    expect(service.montarLinearGradient({ cor1: '#AAA', cor2: '#BBB', direcao: 'horizontal' })).toBe(
      'linear-gradient(90deg, #AAA, #BBB)',
    );
    expect(service.montarLinearGradient({ cor1: '#AAA', cor2: '#BBB', direcao: 'vertical' })).toBe(
      'linear-gradient(180deg, #AAA, #BBB)',
    );
    expect(service.montarLinearGradient({ cor1: '#AAA', cor2: '#BBB', direcao: 'diagonal' })).toBe(
      'linear-gradient(135deg, #AAA, #BBB)',
    );
  });
});
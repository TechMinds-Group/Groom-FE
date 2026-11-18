import { TestBed } from '@angular/core/testing';
import { TemaValidacaoService, TEMA_HEX_REGEX } from './tema-validacao.service';
import { TemaEditorForm, criarCamposVazios, TemaCampoCor } from '../models/tema-editor.model';
import { TemaDirecaoGradiente, TEMA_SLOTS_ESCURO } from '../../../core/models/tema/tema.model';

/** RN-098-11 — regressão das validações do cliente do editor (RN-101/§6.8, pior caso CR-001). */
describe('TemaValidacaoService', () => {
  let service: TemaValidacaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TemaValidacaoService] });
    service = TestBed.inject(TemaValidacaoService);
  });

  /** Formulário base válido (Unica) para os testes. */
  function formulario(overrides?: Partial<TemaEditorForm>): TemaEditorForm {
    return {
      modoPaleta: 'Unica',
      base: {
        primaria: { tipo: 'solido', cor: '#2563EB', cor1: '', cor2: '', direcao: 'horizontal' },
        secundaria: { tipo: 'solido', cor: '#1E40AF', cor1: '', cor2: '', direcao: 'horizontal' },
        acento: { tipo: 'solido', cor: '#F59E0B', cor1: '', cor2: '', direcao: 'horizontal' },
        fundo: { tipo: 'solido', cor: '#FFFFFF', cor1: '', cor2: '', direcao: 'horizontal' },
        texto: { tipo: 'solido', cor: '#1F2937', cor1: '', cor2: '', direcao: 'horizontal' },
      },
      escuro: criarCamposVazios(TEMA_SLOTS_ESCURO),
      logoUrl: '',
      fonteTitulo: '',
      fonteCorpo: '',
      tokensJson: '',
      ...overrides,
    };
  }

  it('regex hex aceita apenas #RRGGBB (§6.8)', () => {
    expect(TEMA_HEX_REGEX.test('#FFFFFF')).toBeTrue();
    expect(TEMA_HEX_REGEX.test('#0f172a')).toBeTrue();
    expect(TEMA_HEX_REGEX.test('#FFF')).toBeFalse();
    expect(TEMA_HEX_REGEX.test('#GGGGGG')).toBeFalse();
    expect(TEMA_HEX_REGEX.test('2563EB')).toBeFalse();
    expect(TEMA_HEX_REGEX.test('#FFFFFFF')).toBeFalse();
  });

  it('campoCorValido: sólido exige hex válida; gradiente exige cor1/cor2 + direção (CR-001)', () => {
    expect(service.campoCorValido({ tipo: 'solido', cor: '#2563EB', cor1: '', cor2: '', direcao: 'horizontal' })).toBeTrue();
    expect(service.campoCorValido({ tipo: 'solido', cor: 'zzz', cor1: '', cor2: '', direcao: 'horizontal' })).toBeFalse();
    expect(
      service.campoCorValido({ tipo: 'gradiente', cor: '#AAA', cor1: '#FFFFFF', cor2: '#000000', direcao: 'diagonal' }),
    ).toBeTrue();
    expect(
      service.campoCorValido({ tipo: 'gradiente', cor: '#AAA', cor1: '#FFFFFF', cor2: '000000', direcao: 'diagonal' }),
    ).toBeFalse();
    const direcaoInvalida: string = 'diagonal2';
    const campoDirecaoInvalida: TemaCampoCor = {
      tipo: 'gradiente',
      cor: '#AAA',
      cor1: '#FFFFFF',
      cor2: '#000000',
      direcao: direcaoInvalida as TemaDirecaoGradiente,
    };
    expect(service.campoCorValido(campoDirecaoInvalida)).toBeFalse();
  });

  it('logoUrlValida exige URL absoluta http(s) quando preenchida (decisão 29/09)', () => {
    expect(service.logoUrlValida('')).toBeTrue();
    expect(service.logoUrlValida('https://exemplo.com/logo.png')).toBeTrue();
    expect(service.logoUrlValida('ftp://x')).toBeFalse();
    expect(service.logoUrlValida('exemplo.com/logo.png')).toBeFalse();
  });

  it('tokensValidos exige objeto JSON válido (RN-101 — Tema.JsonInvalido)', () => {
    expect(service.tokensValidos('')).toBeTrue();
    expect(service.tokensValidos('{"raio":"8px"}')).toBeTrue();
    expect(service.tokensValidos('{"raio":')).toBeFalse();
    expect(service.tokensValidos('"string"')).toBeFalse();
    expect(service.tokensValidos('[1,2]')).toBeFalse();
  });

  it('modoPorModoCompleto exige as 5 cores escuras (RN-099)', () => {
    const form = formulario({ modoPaleta: 'PorModo' });
    expect(service.modoPorModoCompleto(form)).toBeFalse();

    const completo = formulario({ modoPaleta: 'PorModo' });
    completo.escuro = {
      escuroPrimaria: { tipo: 'solido', cor: '#0B5ED7', cor1: '', cor2: '', direcao: 'horizontal' },
      escuroSecundaria: { tipo: 'solido', cor: '#495057', cor1: '', cor2: '', direcao: 'horizontal' },
      escuroAcento: { tipo: 'solido', cor: '#FBBF24', cor1: '', cor2: '', direcao: 'horizontal' },
      escuroFundo: { tipo: 'solido', cor: '#0F172A', cor1: '', cor2: '', direcao: 'horizontal' },
      escuroTexto: { tipo: 'solido', cor: '#F8FAFC', cor1: '', cor2: '', direcao: 'horizontal' },
    };
    expect(service.modoPorModoCompleto(completo)).toBeTrue();
  });

  it('razaoContraste: preto no branco ~21:1; fixture aprovado/reprovado (RN-101)', () => {
    expect(service.razaoContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(service.razaoContraste('#1F2937', '#FFFFFF')).toBeGreaterThan(4.5);
    expect(service.razaoContraste('#7CBA3D', '#FFFFFF')).toBeLessThan(4.5);
  });

  it('contrasteValido: pares texto×fundo e primaria×fundo aprovados no tema válido (RN-101)', () => {
    expect(service.contrasteValido(formulario()).valido).toBeTrue();
  });

  it('contrasteValido: fundo claro com texto claro reprova (RN-101)', () => {
    const form = formulario();
    form.base['fundo'] = { tipo: 'solido', cor: '#FFFFFF', cor1: '', cor2: '', direcao: 'horizontal' };
    form.base['texto'] = { tipo: 'solido', cor: '#E5E7EB', cor1: '', cor2: '', direcao: 'horizontal' };
    const resultado = service.contrasteValido(form);
    expect(resultado.valido).toBeFalse();
    expect(resultado.campo).toBe('texto');
  });

  it('contrasteValido (pior caso CR-001): gradiente em fundo com cor1 aprovada e cor2 reprovada reprova', () => {
    const form = formulario();
    form.base['fundo'] = {
      tipo: 'gradiente',
      cor: '#FFFFFF',
      cor1: '#FFFFFF', // contraste ok com texto #1F2937
      cor2: '#64748B', // contraste insuficiente com texto #1F2937 (pior caso)
      direcao: 'horizontal',
    };
    const resultado = service.contrasteValido(form);
    expect(resultado.valido).toBeFalse();
  });

  it('contrasteValido (pior caso CR-001): gradiente com as duas cores aprovadas passa', () => {
    const form = formulario();
    form.base['fundo'] = {
      tipo: 'gradiente',
      cor: '#FFFFFF',
      cor1: '#FFFFFF',
      cor2: '#F1F5F9',
      direcao: 'diagonal',
    };
    expect(service.contrasteValido(form).valido).toBeTrue();
  });

  it('contrasteValido ignora pares escuros em Unica e avalia em PorModo (RN-099/101)', () => {
    const form = formulario({ modoPaleta: 'PorModo' });
    form.escuro['escuroFundo'] = { tipo: 'solido', cor: '#0F172A', cor1: '', cor2: '', direcao: 'horizontal' };
    form.escuro['escuroTexto'] = { tipo: 'solido', cor: '#1F2937', cor1: '', cor2: '', direcao: 'horizontal' };
    const resultado = service.contrasteValido(form);
    expect(resultado.valido).toBeFalse();
    expect(resultado.campo).toBe('escuroTexto');
  });
});
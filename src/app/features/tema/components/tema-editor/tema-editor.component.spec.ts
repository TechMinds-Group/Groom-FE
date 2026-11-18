import { ComponentFixture, TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TemaEditorComponent } from './tema-editor.component';
import { TemaLeitura } from '../../../../core/models/tema/tema.model';
import { errorInterceptor } from '../../../../core/interceptors/error.interceptor';
import { TmToastService } from '@techminds-group/tm-angular-lib';

describe('TemaEditorComponent', () => {
  let component: TemaEditorComponent;
  let fixture: ComponentFixture<TemaEditorComponent>;
  let httpMock: HttpTestingController;
  let toastSpy: jasmine.SpyObj<TmToastService>;

  const temaSalvo: TemaLeitura = {
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
    logoUrl: null,
    fonteTitulo: null,
    fonteCorpo: null,
    gradientes: null,
    tokens: null,
    atualizadoEm: null,
  };

  beforeEach(async () => {
    toastSpy = jasmine.createSpyObj('TmToastService', ['success', 'error', 'info', 'warning']);

    await TestBed.configureTestingModule({
      imports: [TemaEditorComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: TmToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemaEditorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Flush do GET do boot (ngOnInit) + tick para o carregamento assíncrono concluir. */
  function carregarBoot(tema: TemaLeitura): void {
    httpMock.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/tema')).flush(tema);
    tick();
  }

  it('should create', fakeAsync(() => {
    carregarBoot(temaSalvo);
    expect(component).toBeTruthy();
  }));

  it('deve carregar o tema salvo no boot (§5.30)', fakeAsync(() => {
    carregarBoot(temaSalvo);
    expect(component['configurado']()).toBeTrue();
    expect(component['modoPaleta']()).toBe('Unica');
    expect(component['base']()['primaria'].cor).toBe('#2563EB');
  }));

  it('deve bloquear o Salvar no cliente com hex inválida (RN-101)', fakeAsync(() => {
    carregarBoot(temaSalvo);

    component['base'].update((campos) => ({
      ...campos,
      primaria: { ...campos['primaria'], cor: 'zzz' },
    }));
    component['salvar']();
    tick();

    httpMock.expectNone((r) => r.method === 'PUT');
    expect(component['campoDestacado']()).toBe('primaria');
    expect(component['erroLocal']()).toContain('#RRGGBB');
  }));

  it('deve limpar o grupo escuro ao alternar para Unica (RN-099)', fakeAsync(() => {
    carregarBoot(temaSalvo);

    component['definirModoPaleta']('PorModo');
    expect(component['modoPaleta']()).toBe('PorModo');

    component['escuro'].update((campos) => ({
      ...campos,
      escuroPrimaria: { ...campos['escuroPrimaria'], cor: '#111111' },
    }));

    component['definirModoPaleta']('Unica');
    expect(component['escuro']()['escuroPrimaria'].cor).toBe('');
  }));

  it('deve bloquear PorModo incompleto antes do request (RN-099/101)', fakeAsync(() => {
    carregarBoot(temaSalvo);

    component['definirModoPaleta']('PorModo');
    component['salvar']();
    tick();

    httpMock.expectNone((r) => r.method === 'PUT');
    expect(component['campoDestacado']()).toBe('escuro');
  }));

  it('deve salvar (PUT) um PorModo completo e recarregar o payload salvo', fakeAsync(() => {
    carregarBoot(temaSalvo);

    component['definirModoPaleta']('PorModo');
    component['escuro'].set({
      escuroPrimaria: { tipo: 'solido', cor: '#3B82F6', cor1: '#3B82F6', cor2: '', direcao: 'horizontal' },
      escuroSecundaria: { tipo: 'solido', cor: '#495057', cor1: '#495057', cor2: '', direcao: 'horizontal' },
      escuroAcento: { tipo: 'solido', cor: '#F59E0B', cor1: '#F59E0B', cor2: '', direcao: 'horizontal' },
      escuroFundo: { tipo: 'solido', cor: '#0F172A', cor1: '#0F172A', cor2: '', direcao: 'horizontal' },
      escuroTexto: { tipo: 'solido', cor: '#F8FAFC', cor1: '#F8FAFC', cor2: '', direcao: 'horizontal' },
    });

    component['salvar']();
    const req = httpMock.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/tema'));
    expect(req.request.body.modoPaleta).toBe('PorModo');
    expect(req.request.body.escuroFundo).toBe('#0F172A');
    expect(req.request.body.escuroPrimaria).toBe('#3B82F6');

    req.flush({ ...temaSalvo, modoPaleta: 'PorModo', escuroFundo: '#0F172A', escuroTexto: '#F8FAFC' });
    tick();

    expect(toastSpy.success).toHaveBeenCalled();
    expect(component['configurado']()).toBeTrue();
  }));

  it('deve destacar o campo ao receber 422 Tema.ContrasteInsuficiente mantendo as edições (RN-101)', fakeAsync(() => {
    carregarBoot(temaSalvo);

    component['salvar']();
    const req = httpMock.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/api/tema'));
    req.flush(
      { code: 'Tema.ContrasteInsuficiente', message: 'Contraste insuficiente entre fundo e texto.' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    tick();

    expect(component['campoDestacado']()).toBe('contraste');
    expect(component['erroLocal']()).toContain('Contraste insuficiente');
    expect(component['base']()['primaria'].cor).toBe('#2563EB');
    expect(component['configurado']()).toBeTrue();
  }));

  it('deve preencher o grupo escuro com a sugestão do modo oposto sem persistir (RN-102)', fakeAsync(() => {
    carregarBoot(temaSalvo);

    component['definirModoPaleta']('PorModo');
    component['gerarModoOposto']();
    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url.endsWith('/api/tema/gerar-modo-oposto'));
    expect(req.request.body).toEqual({ origem: 'claro' });
    req.flush({
      modo: 'escuro',
      primaria: '#3B82F6',
      secundaria: '#1D4ED8',
      acento: '#FBBF24',
      fundo: '#0F172A',
      texto: '#F8FAFC',
      gradientes: {
        primaria: { cor1: '#3B82F6', cor2: '#1D4ED8', direcao: 'diagonal' },
      },
    });
    tick();

    expect(component['escuro']()['escuroFundo'].cor).toBe('#0F172A');
    expect(component['escuro']()['escuroPrimaria'].tipo).toBe('gradiente');
    expect(component['escuro']()['escuroPrimaria'].cor2).toBe('#1D4ED8');
    expect(component['escuro']()['escuroPrimaria'].direcao).toBe('diagonal');
    // Nada foi persistido — nenhum PUT disparado (RN-102).
    httpMock.expectNone((r) => r.method === 'PUT');
  }));

  it('deve excluir o tema (DELETE) ao confirmar a restauração (RN-103/100)', fakeAsync(() => {
    carregarBoot(temaSalvo);

    component['abrirRestaurar']();
    expect(component['modalRestaurar']()).toBeTrue();

    component['confirmarRestaurar']();
    httpMock.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/api/tema')).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    tick();
    // Reload do payload após o reset (configurado: false — RN-100).
    httpMock.expectOne((r) => r.method === 'GET' && r.url.endsWith('/api/tema')).flush({
      ...temaSalvo,
      configurado: false,
      modoPaleta: null,
      primaria: null,
      secundaria: null,
      acento: null,
      fundo: null,
      texto: null,
    });
    tick();

    expect(component['modalRestaurar']()).toBeFalse();
    expect(component['configurado']()).toBeFalse();
    expect(toastSpy.success).toHaveBeenCalled();
  }));

  it('deve alternar o estado das seções colapsáveis (accordions — UI_SPEC §5.30)', fakeAsync(() => {
    carregarBoot(temaSalvo);

    expect(component['secoesAbertas']()['paleta']).toBeTrue();
    component['alternarSecao']('paleta');
    expect(component['secoesAbertas']()['paleta']).toBeFalse();
    component['alternarSecao']('paleta');
    expect(component['secoesAbertas']()['paleta']).toBeTrue();
  }));

  it('deve derivar o preview do formulário mesmo sem tema configurado (RN-100/099)', fakeAsync(() => {
    carregarBoot({
      ...temaSalvo,
      configurado: false,
      modoPaleta: null,
      primaria: null,
      secundaria: null,
      acento: null,
      fundo: null,
      texto: null,
    });

    expect(component['configurado']()).toBeFalse();
    // Prefill do formulário (paleta padrão) vira a base do preview — fiel ao form, não ao painel.
    expect((component['temaPreview']().fundo ?? '').toLowerCase()).toBe('#f8fafc');
    expect(component['temaPreview']().configurado).toBeTrue();

    // Editar um slot atualiza o preview imediatamente (ao vivo — §5.30).
    component['atualizarCampo']('base', 'fundo', { cor: '#ABCDEF', cor1: '#ABCDEF' });
    expect(component['temaPreview']().fundo).toBe('#ABCDEF');
  }));
});
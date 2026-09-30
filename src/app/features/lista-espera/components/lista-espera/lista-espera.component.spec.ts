import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { ListaEsperaComponent } from './lista-espera.component';
import { ListaEsperaItem } from '../../../../core/models/lista-espera/lista-espera.model';

describe('ListaEsperaComponent', () => {
  let component: ListaEsperaComponent;
  let fixture: ComponentFixture<ListaEsperaComponent>;
  let httpMock: HttpTestingController;

  function entrada(overrides: Partial<ListaEsperaItem>): ListaEsperaItem {
    return {
      id: 'guid',
      clienteId: 'guid-cliente',
      clienteNome: 'Cliente',
      posicao: 1,
      servicoId: null,
      servicoNome: null,
      profissionalId: null,
      profissionalNome: null,
      horaJanelaInicio: null,
      status: 'Ativa',
      criadaEmUtc: '2026-09-29T12:00:00Z',
      reservaAtiva: null,
      ...overrides,
    };
  }

  const tresEntradasAtivas: ListaEsperaItem[] = [
    entrada({
      id: 'guid-1',
      clienteNome: 'Ana Silva',
      posicao: 1,
      servicoNome: 'Corte',
      profissionalNome: 'Carlos',
      horaJanelaInicio: '09:00',
    }),
    entrada({
      id: 'guid-2',
      clienteNome: 'Bruno Costa',
      posicao: 2,
      servicoNome: 'Barba',
    }),
    entrada({
      id: 'guid-3',
      clienteNome: 'Carla Dias',
      posicao: 3,
      servicoNome: 'Corte + Barba',
      horaJanelaInicio: '14:00',
    }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaEsperaComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaEsperaComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushLista(itens: ListaEsperaItem[]): void {
    const req = httpMock.expectOne((r) => r.url.endsWith('/api/lista-espera'));
    expect(req.request.method).toBe('GET');
    req.flush(itens);
  }

  /**
   * Espera (em microtasks) a emissão de uma request e responde imediatamente —
   * o flush ocorre no mesmo tick do match: a continuação assíncrona do
   * componente (teardown da subscription) pode invalidar a request se o
   * retorno ao teste passar por microtasks antes do flush.
   */
  async function aguardarRequest(
    match: (r: { url: string; method: string }) => boolean,
    responder: (req: TestRequest) => void = (req) => req.flush(null),
  ): Promise<TestRequest> {
    for (let i = 0; i < 50; i++) {
      const encontradas = httpMock.match(match as never);
      if (encontradas.length > 0) {
        const req = encontradas[0];
        responder(req);
        return req;
      }
      // Macrotask: entre macrotasks toda a fila de microtasks da cadeia de
      // promises do componente é executada — cede espaço para a emissão.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    fail('Requisição esperada não foi emitida a tempo');
    throw new Error('unreachable');
  }

  it('deve criar o componente', () => {
    fixture.detectChanges();
    flushLista([]);
    expect(component).toBeTruthy();
  });

  it('deve consultar a lista com a data de hoje como default (fuso local, DEC-002)', async () => {
    fixture.detectChanges();
    const hoje = new Date();
    const esperado = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const req = httpMock.expectOne((r) => r.url.endsWith('/api/lista-espera'));
    expect(req.request.params.get('data')).toBe(esperado);
    expect(component['dataSelecao']()).toBe(esperado);
    req.flush([]);
  });

  it('deve renderizar a tabela em FIFO com posições 1..3 e preferências visíveis (AC 1)', async () => {
    fixture.detectChanges();
    flushLista(tresEntradasAtivas);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['entradas']().length).toBe(3);
    expect(component['entradas']().map((e) => e.posicao)).toEqual([1, 2, 3]);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ana Silva');
    expect(el.textContent).toContain('Bruno Costa');
    expect(el.textContent).toContain('Carla Dias');
    expect(el.textContent).toContain('Corte');
    expect(el.textContent).toContain('Barba');
    expect(el.textContent).toContain('Carlos');
    expect(el.textContent).toContain('09:00');
    expect(el.textContent).toContain('Ativa');
  });

  it('deve exibir o estado vazio quando não há entradas na data', async () => {
    fixture.detectChanges();
    flushLista([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Nenhum cliente na lista de espera nesta data.');
  });

  it('deve remover entrada ativa com confirmação e refletir status Removida na linha (AC 2)', async () => {
    fixture.detectChanges();
    flushLista(tresEntradasAtivas);
    await fixture.whenStable();
    fixture.detectChanges();

    component['abrirRemocao'](component['entradas']()[0]);
    expect(component['modalRemocaoAberto']()).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Remover da lista de espera');

    const promessa = component['confirmarRemocao']();
    const deleteReq = httpMock.expectOne((r) => r.url.endsWith('/api/lista-espera/guid-1'));
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null, { status: 204, statusText: 'No Content' });

    // A recarga só é emitida quando a promise do DELETE resolve no componente.
    await aguardarRequest((r) => r.url.endsWith('/api/lista-espera') && r.method === 'GET', (req) =>
      req.flush([{ ...tresEntradasAtivas[0], status: 'Removida' }, { ...tresEntradasAtivas[1] }, { ...tresEntradasAtivas[2] }]),
    );
    await promessa;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['modalRemocaoAberto']()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Ana Silva');
    const atualizada = component['entradas']().find((e) => e.id === 'guid-1');
    expect(atualizada?.status).toBe('Removida');
  });

  it('deve oferecer ação de remoção apenas para entradas com status Ativa', async () => {
    fixture.detectChanges();
    flushLista([
      entrada({ id: 'guid-ativa', clienteNome: 'Ativa', status: 'Ativa' }),
      entrada({ id: 'guid-removida', clienteNome: 'Removida', status: 'Removida' }),
      entrada({ id: 'guid-expirada', clienteNome: 'Expirada', status: 'Expirada' }),
      entrada({ id: 'guid-convertida', clienteNome: 'Convertida', status: 'Convertida' }),
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    // TmTable renderiza visões desktop e mobile — compara por cliente (title
    // único do botão), não por contagem absoluta de botões.
    const botoes = fixture.nativeElement.querySelectorAll('tm-table button.btn-outline-danger');
    const botoesRemover = Array.from(botoes as NodeListOf<HTMLButtonElement>).map((b) =>
      b.getAttribute('title'),
    );
    expect(botoesRemover).toContain('Remover Ativa da lista');
    expect(botoesRemover.some((t) => /Removida|Expirada|Convertida/.test(t ?? ''))).toBeFalse();
  });

  it('deve exibir badge de reserva ativa com contagem regressiva (MM:SS)', async () => {
    // Consome a leitura do ngOnInit antes de injetar as entradas do teste.
    fixture.detectChanges();
    flushLista([]);
    await fixture.whenStable();

    // 5 min e meio à frente garante "05:xx" no primeiro render (margem de ms).
    const expiraEm = new Date(Date.now() + 5 * 60 * 1000 + 30_000).toISOString();
    component['entradas'].set([
      entrada({
        id: 'guid-reserva',
        clienteNome: 'Com Reserva',
        reservaAtiva: {
          reservaId: 'guid-reserva-id',
          slotInicio: '2026-09-29T15:00:00Z',
          slotFim: '2026-09-29T15:30:00Z',
          profissionalNome: 'Carlos',
          expiraEmUtc: expiraEm,
          servicoNome: 'Corte',
        },
      }),
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('05:');
  });

  it('deve recarregar a lista ao trocar o filtro de data', async () => {
    fixture.detectChanges();
    flushLista([]);
    await fixture.whenStable();

    component['onDataChange']('2026-09-28');
    const req = httpMock.expectOne((r) => r.url.endsWith('/api/lista-espera'));
    expect(req.request.params.get('data')).toBe('2026-09-28');
    req.flush([]);
  });
});

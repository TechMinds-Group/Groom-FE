import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
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

  it('deve exibir o estado vazio da tabela quando não há entradas na data', async () => {
    fixture.detectChanges();
    flushLista([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Nenhum registro encontrado');
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

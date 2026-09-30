import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { EstabelecimentoConfigComponent } from './estabelecimento-config.component';

describe('EstabelecimentoConfigComponent', () => {
  let component: EstabelecimentoConfigComponent;
  let fixture: ComponentFixture<EstabelecimentoConfigComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstabelecimentoConfigComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstabelecimentoConfigComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /** Consome as 3 leituras de carregarInfo (info, validade do link e minutos da lista de espera). */
  function flushCarregarInfo(minutos: number | 'erro'): void {
    httpMock.expectOne((r) => r.url.endsWith('/configuracoes/estabelecimento/info') && r.method === 'GET').flush({});
    httpMock.expectOne((r) => r.url.endsWith('/configuracoes/link')).flush({ dias: 5 });
    const reqMinutos = httpMock.expectOne((r) => r.url.endsWith('/configuracoes/lista-espera'));
    if (minutos === 'erro') {
      reqMinutos.flush(null, { status: 404, statusText: 'Not Found' });
    } else {
      reqMinutos.flush({ minutos });
    }
  }

  /**
   * Avança a cadeia de promises do `salvarInfo` até a emissão da próxima
   * request. `whenStable` drena a fila de microtasks da zona; a retentativa
   * com `match()` + flush síncrono cobre o race em que o `whenStable` resolve
   * antes da microtask que emite a request (não rastreada pela zona).
   */
  async function avancarEConsumir(
    match: (r: { url: string; method: string }) => boolean,
    responder?: (req: TestRequest) => void,
  ): Promise<TestRequest> {
    for (let i = 0; i < 20; i++) {
      const encontradas = httpMock.match(match as never);
      if (encontradas.length > 0) {
        const req = encontradas[0];
        (responder ?? ((r: TestRequest) => r.flush(null)))(req);
        return req;
      }
      await fixture.whenStable();
      await new Promise((r) => setTimeout(r, 0));
    }
    fail('Requisição esperada não foi emitida a tempo');
    throw new Error('unreachable');
  }

  /** Consome a releitura pós-save do `salvarInfo` — apenas o GET de info (RN-074-9). */
  async function consumirReleitura(): Promise<void> {
    await avancarEConsumir(
      (r) => r.url.endsWith('/configuracoes/estabelecimento/info') && r.method === 'GET',
      (req) => req.flush({}),
    );
  }

  it('deve carregar os minutos de reserva da lista de espera (default 15 — RN-076)', async () => {
    fixture.detectChanges();
    flushCarregarInfo('erro');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['minutosReservaListaEspera']()).toBe(15);
    expect(component['minutosReservaListaEsperaOriginal']()).toBe(15);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Minutos de reserva da lista de espera');
  });

  it('deve refletir o valor configurado no campo', async () => {
    fixture.detectChanges();
    flushCarregarInfo(25);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['minutosReservaListaEspera']()).toBe(25);
  });

  it('deve limitar os minutos informados a no mínimo 1', () => {
    component['atualizarMinutosReserva'](0);
    expect(component['minutosReservaListaEspera']()).toBe(1);

    component['atualizarMinutosReserva']('');
    expect(component['minutosReservaListaEspera']()).toBe(15);

    component['atualizarMinutosReserva'](30);
    expect(component['minutosReservaListaEspera']()).toBe(30);
  });

  it('deve persistir os minutos via PUT quando alterados', async () => {
    fixture.detectChanges();
    flushCarregarInfo(15);
    await fixture.whenStable();
    fixture.detectChanges();

    component['atualizarMinutosReserva'](20);
    expect(component['temAlteracoesInfo']()).toBeTrue();

    const promessa = component['salvarInfo']();

    httpMock
      .expectOne((r) => r.url.endsWith('/configuracoes/estabelecimento/info') && r.method === 'PUT')
      .flush(null);
    // O PUT de minutos é emitido só quando a promise do PUT info resolve.
    await avancarEConsumir(
      (r) => r.url.endsWith('/configuracoes/lista-espera') && r.method === 'PUT',
      (req) => {
        expect(req.request.body).toEqual({ minutos: 20 });
        req.flush(null);
      },
    );

    // A releitura de carregarInfo é emitida só quando a promise do PUT minutos resolve.
    await consumirReleitura();
    await promessa;

    expect(component['minutosReservaListaEsperaOriginal']()).toBe(20);
    expect(component['temAlteracoesInfo']()).toBeFalse();
  });

  it('não deve enviar PUT de minutos quando o campo permanece inalterado', async () => {
    fixture.detectChanges();
    flushCarregarInfo(15);
    await fixture.whenStable();
    fixture.detectChanges();

    const promessa = component['salvarInfo']();
    httpMock
      .expectOne((r) => r.url.endsWith('/configuracoes/estabelecimento/info') && r.method === 'PUT')
      .flush(null);

    // A releitura de carregarInfo é emitida só quando a promise do PUT info resolve.
    await consumirReleitura();
    await promessa;

    httpMock.expectNone((r) => r.url.endsWith('/configuracoes/lista-espera') && r.method === 'PUT');
  });
});

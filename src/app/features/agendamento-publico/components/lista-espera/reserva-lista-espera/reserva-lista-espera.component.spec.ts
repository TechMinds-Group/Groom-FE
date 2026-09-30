import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { ReservaListaEsperaComponent } from './reserva-lista-espera.component';
import { ListaEsperaService } from '../../../../../core/services/lista-espera.service';
import { AgendamentoPublicoService } from '../../../../../core/services/agendamento-publico.service';
import { AgendamentoPublico } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';
import { EntrarListaEsperaPayload, ListaEsperaItem, ListaEsperaReserva } from '../../../../../core/models/lista-espera/lista-espera.model';

describe('ReservaListaEsperaComponent', () => {
  let component: ReservaListaEsperaComponent;
  let fixture: ComponentFixture<ReservaListaEsperaComponent>;
  let listaEsperaService: ListaEsperaService;
  let agendamentoPublicoService: AgendamentoPublicoService;
  let toastService: TmToastService;
  let router: Router;

  /** Reserva com janela relativa ao "agora" — o relógio é controlado pelo jasmine.clock. */
  const reservaComJanela = (janelaSegundos: number, ajustes: Partial<ListaEsperaReserva> = {}): ListaEsperaReserva => ({
    reservaId: 'guid-reserva',
    slotInicio: '2026-09-29T14:30:00',
    slotFim: '2026-09-29T15:00:00',
    profissionalNome: 'João',
    expiraEmUtc: new Date(Date.now() + janelaSegundos * 1000).toISOString(),
    servicoNome: 'Corte',
    ...ajustes,
  });

  const agendamentoFake: AgendamentoPublico = {
    id: 'guid-agendamento',
    clienteId: 'guid-cliente',
    profissionalId: 'guid-prof',
    profissionalNome: 'João',
    servicoId: 'guid-servico',
    servicoNome: 'Corte',
    servicoPreco: 30,
    servicoDuracao: 30,
    dataInicio: new Date(),
    dataFim: new Date(),
    status: 'confirmado',
  };

  const entradaFake: ListaEsperaItem = {
    id: 'guid-entrada',
    clienteId: 'guid-cliente',
    clienteNome: 'Cliente Teste',
    posicao: 1,
    servicoId: 'guid-servico-preferido',
    servicoNome: null,
    profissionalId: null,
    profissionalNome: null,
    horaJanelaInicio: null,
    status: 'Ativa',
    criadaEmUtc: '2026-09-29T12:00:00Z',
    reservaAtiva: null,
  };

  const profissionaisFake = [{ id: 'guid-prof', nome: 'João' }];
  const servicosFake = [{ id: 'guid-servico', nome: 'Corte', preco: 30, duracao: 30 }];

  const carregarTela = async (reserva: ListaEsperaReserva): Promise<void> => {
    spyOn(listaEsperaService, 'obterReserva').and.resolveTo(reserva);
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  };

  beforeAll(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 8, 29, 14, 0, 0));
  });

  afterAll(() => {
    jasmine.clock().uninstall();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservaListaEsperaComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (chave: string) => (chave === 'estabelecimento' ? 'barbearia-teste' : 'guid-reserva'),
              },
              parent: null,
              queryParamMap: { get: () => null },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservaListaEsperaComponent);
    component = fixture.componentInstance;
    listaEsperaService = TestBed.inject(ListaEsperaService);
    agendamentoPublicoService = TestBed.inject(AgendamentoPublicoService);
    toastService = TestBed.inject(TmToastService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(toastService, 'success');
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar a reserva e exibir contagem regressiva, profissional, serviço e horário do slot', async () => {
    await carregarTela(reservaComJanela(15 * 60));

    expect(component.estado()).toBe('reserva');
    expect(component.restanteSegundos()).toBe(900);
    expect(component.contagemFormatada()).toBe('15:00');

    jasmine.clock().tick(1000);
    expect(component.contagemFormatada()).toBe('14:59');

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('João');
    expect(el.textContent).toContain('Corte');
    expect(el.textContent).toContain('14:30');
    expect(el.textContent).toContain('Confirmar horário');
  });

  it('deve exibir o estado expirado com reentrada quando a reserva veio expirada (410)', async () => {
    spyOn(listaEsperaService, 'obterReserva').and.rejectWith({
      error: { code: 'ListaEspera.ReservaExpirada' },
    });
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(component.estado()).toBe('expirada');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Reserva expirada');
    expect(el.textContent).toContain('Entrar na lista novamente');
  });

  it('deve exibir erro pessoal quando a reserva pertence a outro cliente (403)', async () => {
    spyOn(listaEsperaService, 'obterReserva').and.rejectWith({
      error: { code: 'ListaEspera.ReservaProibida' },
    });
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(component.estado()).toBe('erro');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('pertence a outro cliente');
  });

  it('deve transitar para o estado expirado sem permitir confirmação quando o contador zerar com a tela aberta', async () => {
    const criar = spyOn(agendamentoPublicoService, 'criarAgendamento').and.resolveTo(agendamentoFake);
    await carregarTela(reservaComJanela(2));

    expect(component.estado()).toBe('reserva');

    jasmine.clock().tick(3000);

    expect(component.estado()).toBe('expirada');

    fixture.detectChanges();
    await component.confirmar();

    expect(criar).not.toHaveBeenCalled();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Entrar na lista novamente');
  });

  it('deve confirmar o horário criando o agendamento com os ids resolvidos e o reservaId', async () => {
    spyOn(agendamentoPublicoService, 'getProfissionais').and.resolveTo(profissionaisFake);
    spyOn(agendamentoPublicoService, 'getServicosProfissional').and.resolveTo(servicosFake);
    const criar = spyOn(agendamentoPublicoService, 'criarAgendamento').and.resolveTo(agendamentoFake);
    await carregarTela(reservaComJanela(15 * 60));

    await component.confirmar();

    expect(criar).toHaveBeenCalledWith({
      profissionalId: 'guid-prof',
      servicoId: 'guid-servico',
      dataInicio: '2026-09-29T14:30:00',
      reservaId: 'guid-reserva',
    });
    expect(component.estado()).toBe('confirmado');
    expect(toastService.success).toHaveBeenCalled();
  });

  it('deve usar a preferência de serviço da entrada quando a reserva não informa serviço', async () => {
    spyOn(agendamentoPublicoService, 'getProfissionais').and.resolveTo(profissionaisFake);
    spyOn(listaEsperaService, 'meuStatus').and.resolveTo(entradaFake);
    const criar = spyOn(agendamentoPublicoService, 'criarAgendamento').and.resolveTo(agendamentoFake);
    await carregarTela(reservaComJanela(15 * 60, { servicoNome: null }));

    await component.confirmar();

    expect(criar).toHaveBeenCalledWith(
      jasmine.objectContaining({ servicoId: 'guid-servico-preferido' }),
    );
  });

  it('deve não criar o agendamento quando não consegue resolver os ids da reserva', async () => {
    spyOn(agendamentoPublicoService, 'getProfissionais').and.resolveTo([
      { id: 'guid-prof', nome: 'Maria' },
    ]);
    const criar = spyOn(agendamentoPublicoService, 'criarAgendamento').and.resolveTo(agendamentoFake);
    await carregarTela(reservaComJanela(15 * 60));

    await component.confirmar();

    expect(criar).not.toHaveBeenCalled();
    expect(component.estado()).toBe('reserva');
    expect(component.erroMensagem()).toContain('Não foi possível identificar');
  });

  it('deve tratar conflito na confirmação transicionando para expirado com explicação (RN-009)', async () => {
    spyOn(agendamentoPublicoService, 'getProfissionais').and.resolveTo(profissionaisFake);
    spyOn(agendamentoPublicoService, 'getServicosProfissional').and.resolveTo(servicosFake);
    spyOn(agendamentoPublicoService, 'criarAgendamento').and.rejectWith({
      error: { code: 'Agendamento.Conflito' },
    });
    await carregarTela(reservaComJanela(15 * 60));

    await component.confirmar();

    expect(component.estado()).toBe('expirada');
    expect(component.mensagemExpiracao()).toContain('ocupado');
  });

  it('deve tratar reserva expirada durante a confirmação como estado expirado (RN-076)', async () => {
    spyOn(agendamentoPublicoService, 'getProfissionais').and.resolveTo(profissionaisFake);
    spyOn(agendamentoPublicoService, 'getServicosProfissional').and.resolveTo(servicosFake);
    spyOn(agendamentoPublicoService, 'criarAgendamento').and.rejectWith({
      error: { code: 'ListaEspera.ReservaExpirada' },
    });
    await carregarTela(reservaComJanela(15 * 60));

    await component.confirmar();

    expect(component.estado()).toBe('expirada');
    expect(component.mensagemExpiracao()).toContain('expirou');
  });

  it('deve manter o estado de reserva com mensagem quando a confirmação falha por erro mapeável', async () => {
    spyOn(agendamentoPublicoService, 'getProfissionais').and.resolveTo(profissionaisFake);
    spyOn(agendamentoPublicoService, 'getServicosProfissional').and.resolveTo(servicosFake);
    spyOn(agendamentoPublicoService, 'criarAgendamento').and.rejectWith({
      error: { code: 'Agendamento.ProfissionalSemWhatsApp' },
    });
    await carregarTela(reservaComJanela(15 * 60));

    await component.confirmar();

    expect(component.estado()).toBe('reserva');
    expect(component.erroMensagem()).toContain('WhatsApp');
  });

  it('deve entrar na lista novamente e navegar para a página da lista', async () => {
    const entrar = spyOn(listaEsperaService, 'entrar').and.resolveTo(entradaFake);
    await carregarTela(reservaComJanela(15 * 60));

    const preferencias: EntrarListaEsperaPayload = { servicoId: null, profissionalId: null, horaJanelaInicio: null };
    await component.entrarLista(preferencias);

    expect(entrar).toHaveBeenCalledWith(preferencias);
    expect(toastService.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/agendamento', 'barbearia-teste', 'lista-espera']);
  });
});

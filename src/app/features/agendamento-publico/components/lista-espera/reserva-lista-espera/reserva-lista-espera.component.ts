import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublicoService } from '../../../../../core/services/agendamento-publico.service';
import { ListaEsperaService } from '../../../../../core/services/lista-espera.service';
import { EntrarListaEsperaPayload, ListaEsperaReserva } from '../../../../../core/models/lista-espera/lista-espera.model';
import { agendamentoParaDateLocal } from '../../../../../core/models/agenda.model';
import { ListaEsperaModalPreferenciasComponent } from '../../modais/lista-espera-modal-preferencias/lista-espera-modal-preferencias.component';
import { AppFooterComponent } from '../../../../../shared/components/footer/app-footer.component';
import { TemaPublicoService } from '../../../services/tema-publico.service';

/** Estados da tela de confirmação do slot reservado (UI_SPEC §5.14). */
type EstadoReserva = 'carregando' | 'reserva' | 'expirada' | 'confirmado' | 'erro';

/** Corpo de erro do backend { code, description } — camelCase ou PascalCase. */
interface ErroApi {
  code?: string;
  Code?: string;
  description?: string;
  Description?: string;
}

/** Extrai o código de negócio do corpo do erro HTTP sem perder tipagem. */
function codigoDeErro(err: unknown): string | null {
  if (err && typeof err === 'object' && 'error' in err) {
    const corpo = (err as { error?: ErroApi }).error;
    return corpo?.code ?? corpo?.Code ?? null;
  }
  return null;
}

/**
 * Normaliza o ISO do slot para "YYYY-MM-DDTHH:mm:00" sem conversão de fuso —
 * convenção do portal (hora local tratada como UTC; ver agendamentoParaDateLocal).
 */
function slotParaDataInicio(slot: string): string {
  const partes = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(slot);
  return partes ? `${partes[1]}T${partes[2]}:00` : slot;
}

/** Ids exigidos pelo POST do portal — ausentes no DTO do deep link (só nomes). */
interface IdsDaReserva {
  profissionalId: string;
  servicoId: string;
}

/**
 * Tela de confirmação do slot reservado (UI_SPEC §5.14 — rota
 * `/agendamento/:estabelecimento/lista-espera/reserva/:reservaId`, deep link do
 * WhatsApp — RN-075/076): exibe profissional, horário do slot, serviço (quando
 * informado) e contagem regressiva até `expiraEmUtc` (relógio do cliente, mas o
 * instante do servidor é a verdade). "Confirmar horário" cria o agendamento
 * público no slot com `reservaId` (validações RN-007..009 no backend). Reserva
 * expirada → aviso com "Entrar na lista novamente" (limite de 1 entrada/dia no
 * backend — `ListaEspera.Duplicada` vira toast do errorInterceptor).
 */
@Component({
  selector: 'app-reserva-lista-espera',
  standalone: true,
  imports: [AppFooterComponent, ListaEsperaModalPreferenciasComponent],
  templateUrl: './reserva-lista-espera.component.html',
  styleUrl: './reserva-lista-espera.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservaListaEsperaComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listaEsperaService = inject(ListaEsperaService);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly toastService = inject(TmToastService);
  private readonly temaPublico = inject(TemaPublicoService);

  private contagemTimer: ReturnType<typeof setInterval> | null = null;
  private estabelecimentoSlug = '';

  readonly estado = signal<EstadoReserva>('carregando');
  readonly reserva = signal<ListaEsperaReserva | null>(null);
  readonly restanteSegundos = signal(0);
  readonly confirmando = signal(false);
  readonly entrandoNovamente = signal(false);
  readonly modalReentrada = signal(false);
  readonly erroMensagem = signal<string | null>(null);
  readonly mensagemExpiracao = signal<string | null>(null);

  /** Contagem regressiva "MM:SS" da janela da reserva (default 15 min — RN-076). */
  readonly contagemFormatada = computed(() => {
    const total = this.restanteSegundos();
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  });

  readonly titulo = computed(() => {
    switch (this.estado()) {
      case 'reserva':
        return 'Sua vaga chegou!';
      case 'expirada':
        return 'Reserva expirada';
      case 'confirmado':
        return 'Horário confirmado!';
      case 'carregando':
        return 'Consultando sua reserva...';
      default:
        return 'Não foi possível continuar';
    }
  });

  async ngOnInit(): Promise<void> {
    const slug =
      this.route.snapshot.paramMap.get('estabelecimento') ||
      this.route.snapshot.parent?.paramMap.get('estabelecimento');
    if (slug) {
      this.agendamentoPublicoService.setEstabelecimento(slug);
    }
    this.estabelecimentoSlug = slug || this.agendamentoPublicoService.estabelecimento() || '';
    await this.carregarReserva();
  }

  ngOnDestroy(): void {
    this.pararContagem();
    this.temaPublico.restaurarTemaAnterior();
  }

  /** Consulta a reserva; 410 `ListaEspera.ReservaExpirada` já abre o estado expirado. */
  private async carregarReserva(): Promise<void> {
    const reservaId = this.route.snapshot.paramMap.get('reservaId');
    if (!reservaId) {
      this.estado.set('erro');
      this.erroMensagem.set('Reserva não encontrada.');
      return;
    }
    try {
      this.reserva.set(await this.listaEsperaService.obterReserva(reservaId));
      this.estado.set('reserva');
      this.iniciarContagem();
    } catch (err) {
      this.tratarFalhaAoCarregar(err);
    }
  }

  private tratarFalhaAoCarregar(err: unknown): void {
    const codigo = codigoDeErro(err);
    if (codigo === 'ListaEspera.ReservaExpirada') {
      this.estado.set('expirada');
      return;
    }
    this.estado.set('erro');
    if (codigo === 'ListaEspera.ReservaProibida') {
      this.erroMensagem.set('Esta reserva pertence a outro cliente — o link recebido por WhatsApp é pessoal.');
    } else if (codigo === 'ListaEspera.ReservaNaoEncontrada') {
      this.erroMensagem.set('Reserva não encontrada.');
    } else {
      this.erroMensagem.set('Não foi possível carregar sua reserva. Tente novamente.');
    }
  }

  /**
   * Contagem regressiva da janela: `expiraEmUtc` do servidor é a verdade e o
   * instante é comparado com o relógio do cliente (UTC — DEC-002 não afeta a
   * duração). Zerou com a tela aberta → transita para expirado sem confirmar.
   */
  private iniciarContagem(): void {
    const reserva = this.reserva();
    if (!reserva) {
      return;
    }
    const expiraEm = Date.parse(reserva.expiraEmUtc);
    const atualizar = (): void => {
      const restante = Math.max(0, Math.floor((expiraEm - Date.now()) / 1000));
      this.restanteSegundos.set(restante);
      if (restante <= 0) {
        this.pararContagem();
        this.estado.set('expirada');
      }
    };
    atualizar();
    if (this.estado() === 'reserva') {
      this.contagemTimer = setInterval(atualizar, 1000);
    }
  }

  private pararContagem(): void {
    if (this.contagemTimer !== null) {
      clearInterval(this.contagemTimer);
      this.contagemTimer = null;
    }
  }

  /** Slot exibido no fuso local do estabelecimento (UTC-3 — DEC-002), sem conversão. */
  formatarSlot(): string {
    const reserva = this.reserva();
    if (!reserva) {
      return '';
    }
    const inicio = agendamentoParaDateLocal(reserva.slotInicio);
    const fim = agendamentoParaDateLocal(reserva.slotFim);
    const data = inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    return `${data} · ${this.horaDe(inicio)} às ${this.horaDe(fim)}`;
  }

  private horaDe(data: Date): string {
    return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
  }

  async confirmar(): Promise<void> {
    const reserva = this.reserva();
    if (!reserva || this.estado() !== 'reserva' || this.confirmando() || this.restanteSegundos() <= 0) {
      return;
    }
    this.confirmando.set(true);
    this.erroMensagem.set(null);
    try {
      const ids = await this.resolverIdsDaReserva(reserva);
      if (!ids) {
        this.erroMensagem.set('Não foi possível identificar os dados do horário reservado. Fale com o estabelecimento ou agende normalmente pelo portal.');
        return;
      }
      await this.agendamentoPublicoService.criarAgendamento({
        profissionalId: ids.profissionalId,
        servicoId: ids.servicoId,
        dataInicio: slotParaDataInicio(reserva.slotInicio),
        reservaId: reserva.reservaId,
      });
      this.pararContagem();
      this.estado.set('confirmado');
      this.toastService.success('Seu horário foi confirmado!', 'Agendamento');
    } catch (err) {
      this.tratarFalhaAoConfirmar(err);
    } finally {
      this.confirmando.set(false);
    }
  }

  /** RN-007..009 e RN-076 no backend → estado expirado com explicação. */
  private tratarFalhaAoConfirmar(err: unknown): void {
    const codigo = codigoDeErro(err);
    if (codigo === 'ListaEspera.ReservaExpirada' || codigo === 'ListaEspera.ReservaNaoEncontrada') {
      this.expirarComAviso('Sua reserva expirou enquanto o horário era confirmado.');
    } else if (codigo === 'Agendamento.DataPassada') {
      this.expirarComAviso('Este horário já passou e não pode mais ser confirmado.');
    } else if (codigo === 'Agendamento.HorarioIndisponivel' || codigo === 'Agendamento.Conflito') {
      this.expirarComAviso('O horário acabou de ser ocupado por outra pessoa — a vaga não está mais disponível.');
    } else if (codigo === 'Agendamento.ProfissionalSemWhatsApp') {
      this.erroMensagem.set('Este profissional ainda não cadastrou um número de WhatsApp. Solicite o cadastro ao estabelecimento.');
    } else {
      this.erroMensagem.set('Não foi possível confirmar o horário. Tente novamente.');
    }
  }

  private expirarComAviso(mensagem: string): void {
    this.pararContagem();
    this.mensagemExpiracao.set(mensagem);
    this.estado.set('expirada');
  }

  /**
   * Resolve os ids do payload a partir dos nomes da reserva — o DTO do deep link
   * (API_CONTRACTS §15.1) retorna apenas `profissionalNome`/`servicoNome`, enquanto
   * o POST do portal exige Guids válidos. Sem `servicoNome`, usa a preferência
   * salva na entrada ativa do dia.
   */
  private async resolverIdsDaReserva(reserva: ListaEsperaReserva): Promise<IdsDaReserva | null> {
    const profissionais = await this.agendamentoPublicoService.getProfissionais().catch(() => []);
    const profissional = profissionais.find((p) => p.nome === reserva.profissionalNome);
    if (!profissional) {
      return null;
    }
    if (reserva.servicoNome) {
      const servicos = await this.agendamentoPublicoService.getServicosProfissional(profissional.id).catch(() => []);
      const servico = servicos.find((s) => s.nome === reserva.servicoNome);
      return servico ? { profissionalId: profissional.id, servicoId: servico.id } : null;
    }
    const entrada = await this.listaEsperaService.meuStatus().catch(() => null);
    return entrada?.servicoId ? { profissionalId: profissional.id, servicoId: entrada.servicoId } : null;
  }

  /** Reentrada na lista — sujeita ao limite de 1 entrada ativa/dia (RN-074). */
  entrarNaListaNovamente(): void {
    this.modalReentrada.set(true);
  }

  async entrarLista(preferencias: EntrarListaEsperaPayload): Promise<void> {
    this.entrandoNovamente.set(true);
    try {
      await this.listaEsperaService.entrar(preferencias);
      this.toastService.success('Você entrou na lista de espera!', 'Lista de Espera');
      this.modalReentrada.set(false);
      void this.router.navigate(['/agendamento', this.estabelecimentoSlug, 'lista-espera']);
    } catch {
      // 409 `ListaEspera.Duplicada` → toast do backend via errorInterceptor; modal segue aberto
    } finally {
      this.entrandoNovamente.set(false);
    }
  }

  irParaAgendamento(): void {
    void this.router.navigate(['/agendamento', this.estabelecimentoSlug, 'novo']);
  }
}

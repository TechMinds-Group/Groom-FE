import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, NgZone, OnDestroy, OnInit, input, signal } from '@angular/core';
import { TmButtonComponent, TmModalComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { ListaEsperaService } from '../../../../../core/services/lista-espera.service';
import { AgendamentoPublicoService } from '../../../../../core/services/agendamento-publico.service';
import { EntrarListaEsperaPayload, ListaEsperaItem } from '../../../../../core/models/lista-espera/lista-espera.model';
import { agendamentoParaDateLocal } from '../../../../../core/models/agenda.model';
import { ListaEsperaModalPreferenciasComponent } from '../../modais/lista-espera-modal-preferencias/lista-espera-modal-preferencias.component';
import { ReservaSlotResolverService, codigoDeErro, slotParaDataInicio } from '../../../services/reserva-slot-resolver.service';

/**
 * Widget da lista de espera no portal (UI_SPEC §5.14): com entrada ativa exibe o
 * card de status ("posição N do dia") com ação "Sair da lista"; sem entrada exibe
 * o botão "Entrar na lista de espera" que abre o modal de preferências. O pedido
 * de entrada vindo do header/passo (`abrirComPreset`) abre o modal de STATUS —
 * apenas informativo — quando o cliente já está na fila. O estado da entrada vive
 * no `ListaEsperaService` (compartilhado entre as instâncias do topo e do passo),
 * e é re-sincronizado a cada abertura do modal. Erros de negócio são exibidos
 * como toast pelo errorInterceptor (§5.14).
 */
@Component({
  selector: 'app-lista-espera-portal',
  standalone: true,
  imports: [DatePipe, TmButtonComponent, TmModalComponent, ListaEsperaModalPreferenciasComponent],
  templateUrl: './lista-espera-portal.component.html',
  styleUrl: './lista-espera-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ReservaSlotResolverService],
})
export class ListaEsperaPortalComponent implements OnInit, OnDestroy {
  private readonly listaEsperaService = inject(ListaEsperaService);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly toastService = inject(TmToastService);
  private readonly reservaSlotResolver = inject(ReservaSlotResolverService);
  private readonly ngZone = inject(NgZone);

  /**
   * Modo status-only (topo do wizard): sem entrada ativa não exibe o botão de
   * entrar — a entrada pela lista fica no passo de data/horário (slots ocupados
   * clicáveis e blocos de "sem horários").
   */
  readonly somenteStatus = input(false);

  // Aprovado pelo operador (exceção à regra SignalR do AGENTS 6b): o hub de agenda
  // é autenticado por cookie staff e o cliente público não tem hub — o widget
  // re-sincroniza o status a cada 20s para a vaga aparecer imediatamente após
  // o cancelamento do outro cliente.
  private static readonly POLLING_MS = 20000;

  private contagemTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly carregando = signal(true);

  /** Entrada ativa do dia — compartilhada via `ListaEsperaService` entre os widgets do portal. */
  readonly entrada = computed(() => this.listaEsperaService.statusAtual());

  /** RN-074/075 — reserva ativa da entrada: quando existe, o card de vaga substitui o de fila. */
  readonly reservaAtiva = computed(() => this.entrada()?.reservaAtiva ?? null);
  readonly restanteSegundos = signal(0);
  readonly confirmandoReserva = signal(false);
  readonly recusandoReserva = signal(false);

  /** Contagem regressiva "MM:SS" da janela da reserva (default 15 min — RN-076). */
  readonly contagemFormatada = computed(() => {
    const total = this.restanteSegundos();
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  });

  readonly modalAberto = signal(false);
  readonly entrando = signal(false);
  readonly saindo = signal(false);

  /** RN-074 — modal de status quando o cliente já está na fila e pede a lista de novo. */
  readonly modalStatus = signal(false);

  /** Preferências pré-preenchidas (ex.: slot ocupado clicado) aplicadas ao abrir o modal. */
  readonly preset = signal<Partial<EntrarListaEsperaPayload> | null>(null);

  /**
   * RN-074 — modo slot específico (hora clicada ocupada): repassado ao modal, que oculta
   * o campo "a partir de que horas" e cria a entrada com janela início+fim. Null = modo dia.
   */
  readonly horaEspecifica = signal<string | null>(null);

  constructor() {
    // Preset é consumido pelo modal na abertura; limpa ao fechar para não reaparecer.
    effect(() => {
      if (!this.modalAberto() && !this.modalStatus()) {
        this.preset.set(null);
        this.horaEspecifica.set(null);
      }
    });

    // RN-074/075 — contagem regressiva da reserva ativa (`expiraEmUtc` do servidor é a
    // verdade): zerou com o widget aberto → re-sincroniza (reserva expira → card volta
    // ao estado de fila).
    effect(() => {
      const reserva = this.reservaAtiva();
      if (!reserva) {
        this.pararContagem();
        this.restanteSegundos.set(0);
        return;
      }
      const expiraEm = Date.parse(reserva.expiraEmUtc);
      const atualizar = (): void => {
        const restante = Math.max(0, Math.floor((expiraEm - Date.now()) / 1000));
        this.restanteSegundos.set(restante);
        if (restante <= 0) {
          this.pararContagem();
          void this.recarregarStatus();
        }
      };
      atualizar();
      this.pararContagem();
      this.ngZone.runOutsideAngular(() => {
        this.contagemTimer = setInterval(atualizar, 1000);
      });
    });

    // Re-sincronização leve e contínua — mantém o card de vaga aparecendo imediatamente
    // (e some quando confirmada/recusada/expirada por outro canal, ex. WhatsApp).
    // runOutsideAngular: timer recorrente dentro da zone deixaria whenStable() dos
    // testes instável para sempre; signal writes disparam CD mesmo fora da zone.
    this.ngZone.runOutsideAngular(() => {
      this.pollTimer = setInterval(() => {
        void this.recarregarStatus();
      }, ListaEsperaPortalComponent.POLLING_MS);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.recarregarStatus();
  }

  ngOnDestroy(): void {
    this.pararContagem();
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** Re-sincroniza a entrada ativa do dia no serviço compartilhado. */
  private async recarregarStatus(): Promise<void> {
    try {
      await this.listaEsperaService.meuStatus();
    } catch {
      // Erro já exibido como toast pelo errorInterceptor; mantém o último status conhecido
    } finally {
      this.carregando.set(false);
    }
  }

  private pararContagem(): void {
    if (this.contagemTimer !== null) {
      clearInterval(this.contagemTimer);
      this.contagemTimer = null;
    }
  }

  /** Slot exibido no fuso local do estabelecimento (UTC-3 — DEC-002), sem conversão. */
  formatarSlotReservado(): string {
    const reserva = this.reservaAtiva();
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

  /**
   * RN-074/075 — confirma a vaga reservada direto pelo widget (mesmo POST do portal
   * usado pela tela da reserva): resolve os ids e cria o agendamento no slot.
   */
  async confirmarReservaVaga(): Promise<void> {
    const reserva = this.reservaAtiva();
    if (!reserva || this.confirmandoReserva() || this.restanteSegundos() <= 0) {
      return;
    }
    this.confirmandoReserva.set(true);
    try {
      const ids = await this.reservaSlotResolver.resolver(reserva);
      if (!ids) {
        this.toastService.info('Não foi possível identificar os dados do horário reservado. Tente novamente em instantes.', 'Lista de Espera');
        return;
      }
      await this.agendamentoPublicoService.criarAgendamento({
        profissionalId: ids.profissionalId,
        servicoId: ids.servicoId,
        dataInicio: slotParaDataInicio(reserva.slotInicio),
        reservaId: reserva.reservaId,
      });
      this.toastService.success('Seu horário foi confirmado!', 'Agendamento');
      await this.recarregarStatus();
    } catch (err) {
      await this.tratarFalhaNaVaga(err);
    } finally {
      this.confirmandoReserva.set(false);
    }
  }

  /** RN-074/075 — recusa pelo widget: reserva → "Cancelada" + repasse FIFO imediato. */
  async recusarReservaVaga(): Promise<void> {
    const reserva = this.reservaAtiva();
    if (!reserva || this.recusandoReserva()) {
      return;
    }
    this.recusandoReserva.set(true);
    try {
      await this.listaEsperaService.recusarReserva(reserva.reservaId);
      this.toastService.success('Recusa registrada — o horário foi liberado.', 'Lista de Espera');
      await this.recarregarStatus();
    } catch (err) {
      await this.tratarFalhaNaVaga(err);
    } finally {
      this.recusandoReserva.set(false);
    }
  }

  /** 403/404/410 do backend → mensagem coerente + re-sincronização do card. */
  private async tratarFalhaNaVaga(err: unknown): Promise<void> {
    const codigo = codigoDeErro(err);
    if (codigo === 'ListaEspera.ReservaExpirada' || codigo === 'ListaEspera.ReservaNaoEncontrada') {
      this.toastService.info('Sua reserva já foi processada ou expirou.', 'Lista de Espera');
    } else if (codigo === 'Agendamento.Conflito' || codigo === 'Agendamento.HorarioIndisponivel') {
      this.toastService.info('O horário acabou de ser ocupado por outra pessoa.', 'Lista de Espera');
    } else if (codigo === 'ListaEspera.SlotReservado') {
      this.toastService.info('Este horário está reservado para outro cliente da fila.', 'Lista de Espera');
    }
    // Demais erros de negócio → toast já exibido pelo errorInterceptor
    await this.recarregarStatus();
  }

  abrirModal(): void {
    this.modalAberto.set(true);
  }

  /**
   * Abre o modal de preferências pré-preenchido (entrada via horário ocupado
   * clicado no passo data/horário — RN-074). `horaEspecifica` ativa o modo slot:
   * horário exato (janela início+fim), sem o campo "a partir de que horas".
   * RN-074 — cliente já na fila: re-sincroniza o status e abre o modal de STATUS
   * (apenas informativo) em vez do formulário — mesmo quando outra instância do
   * widget fez a entrada (estado compartilhado no serviço).
   */
  async abrirComPreset(preset: Partial<EntrarListaEsperaPayload>, horaEspecifica: string | null = null): Promise<void> {
    await this.recarregarStatus();

    if (this.entrada()) {
      this.modalStatus.set(true);
      return;
    }

    this.preset.set(preset);
    this.horaEspecifica.set(horaEspecifica);
    this.modalAberto.set(true);
  }

  /** Fecha o modal de status sem ações (botão Fechar/backdrop/X). */
  fecharStatus(): void {
    this.modalStatus.set(false);
  }

  /** Sair da lista a partir do modal de status: remove a entrada e fecha o modal. */
  async sairDoModal(): Promise<void> {
    if (this.saindo()) {
      return;
    }

    await this.sair();
    this.modalStatus.set(false);
  }

  /** Cria a entrada com as preferências do modal; 409 `ListaEspera.Duplicada` vira toast do backend. */
  async entrar(preferencias: EntrarListaEsperaPayload): Promise<void> {
    this.entrando.set(true);
    try {
      await this.listaEsperaService.entrar(preferencias);
      this.modalAberto.set(false);
      this.toastService.success('Você entrou na lista de espera!', 'Lista de Espera');
    } catch {
      // Re-sincroniza: se a entrada já existia (409), o card de status passa a ser exibido
      await this.recarregarStatus();
      if (this.entrada()) {
        this.modalAberto.set(false);
      }
    } finally {
      this.entrando.set(false);
    }
  }

  /** Remove a própria entrada e volta ao estado inicial (botão de entrar). */
  async sair(): Promise<void> {
    const atual = this.entrada();
    if (!atual || this.saindo()) {
      return;
    }
    this.saindo.set(true);
    try {
      await this.listaEsperaService.sair(atual.id);
      this.toastService.success('Você saiu da lista de espera.', 'Lista de Espera');
    } catch {
      // 404 ou falha transiente: re-sincroniza com o servidor
      await this.recarregarStatus();
    } finally {
      this.saindo.set(false);
    }
  }
}

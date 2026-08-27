import {
  Component,
  signal,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  OnInit,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { TmCalendarComponent, TmSelectComponent, TmSelectOption } from '@techminds-group/tm-angular-lib';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { AgendaService } from '../data-access/agenda.service';
import { AuthService } from '../../../core/services/auth.service';
import { AgendaModalDiaComponent } from '../components/modais/agenda-modal-dia/agenda-modal-dia.component';
import { CORES_STATUS, agendamentoParaDateLocal } from '../../../core/models/agenda.model';

import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';

import { GestaoUsuariosService } from '../../../core/services/gestao-usuarios.service';
import { ThemeService } from '../../../core/services/theme.service';
import { BloqueioAgendaDTO, BloqueioAgendaService } from '../../../core/services/bloqueio-agenda.service';

/** Breakpoint Bootstrap md — abaixo disso usa View Dia para melhor legibilidade em mobile. */
const MOBILE_BREAKPOINT = 992;

/** Intervalo de recarga automática da página da agenda. */
const REFRESH_INTERVAL_MS = 60_000;

export type FiltroStatus = 'todos' | 'confirmado' | 'aguardando' | 'recusado';

/**
 * Calendário da agenda interna com modal de gestão de agendamentos por dia (RF-31/D-12/D-13).
 */
@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, TmCalendarComponent, AgendaModalDiaComponent, TmSelectComponent],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarioComponent implements OnInit, OnDestroy {
  private readonly agendaService = inject(AgendaService);
  protected readonly authService = inject(AuthService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  protected readonly themeService = inject(ThemeService);
  private readonly bloqueioService = inject(BloqueioAgendaService);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly bloqueios = signal<BloqueioAgendaDTO[]>([]);

  CalendarView = CalendarView;
  viewDate = signal(new Date());

  /** View inicial: Dia em mobile, Mês em desktop. */
  currentView = signal<CalendarView>(this.resolveInitialView());

  /** Indica se o dispositivo atual é mobile (< md Bootstrap). */
  readonly isMobile = signal(this.checkIsMobile());

  /** Estado do Modal de Gestão do Dia */
  protected readonly showModalDia = signal(false);
  protected readonly dataSelecionadaModal = signal<Date | null>(null);

  /** Filtro de profissional selecionado (ID do profissional ou 'todos'). */
  protected readonly profissionalIdFiltro = signal<string>('todos');

  /** Estado do filtro de agendamento por status (Todos, Confirmado, Aguardando, Recusado/Cancelado). */
  protected readonly filtroStatus = signal<FiltroStatus>('todos');

  protected readonly opcoesFiltroProfissional = computed<TmSelectOption<string>[]>(() => {
    const user = this.authService.currentUser();
    const isProfOnly = !this.authService.hasAdminRole();

    if (isProfOnly && user) {
      const userProf = this.gestaoUsuariosService.usuarios().find((u) => u.id === user.id);
      const nomeCompleto = userProf
        ? `${userProf.nome} ${userProf.sobrenome ?? ''}`.trim()
        : user.nome || 'Meus Agendamentos';
      return [{ value: user.id, label: nomeCompleto }];
    }

    const todosProfs = this.gestaoUsuariosService.usuarios().filter((u) => u.status !== 'Inativo');
    const options: TmSelectOption<string>[] = [
      { value: 'todos', label: 'Todos os profissionais' },
      ...todosProfs.map((u) => ({
        value: u.id,
        label: `${u.nome} ${u.sobrenome ?? ''}`.trim(),
      })),
    ];
    return options;
  });

  protected readonly opcoesFiltroStatus: TmSelectOption<FiltroStatus>[] = [
    { value: 'todos', label: 'Todos os agendamentos' },
    { value: 'confirmado', label: 'Confirmados' },
    { value: 'aguardando', label: 'Aguardando confirmação' },
    { value: 'recusado', label: 'Recusados / Cancelados' },
  ];

  protected onFiltroChange(val: unknown): void {
    if (val && typeof val === 'string') {
      this.filtroStatus.set(val as FiltroStatus);
    }
  }

  protected onProfissionalFilterChange(val: unknown): void {
    if (val && typeof val === 'string') {
      this.profissionalIdFiltro.set(val);
    }
  }

  private readonly todosAgendamentos = this.agendaService.getAgendamentosFiltrados(this.authService.currentUser());

  readonly agendamentosFiltrados = computed(() => {
    let list = this.todosAgendamentos();
    const user = this.authService.currentUser();
    const isProfOnly = !this.authService.hasAdminRole();

    if (isProfOnly && user) {
      list = list.filter((a) => a.profissionalId === user.id);
    } else {
      const profId = this.profissionalIdFiltro();
      if (profId !== 'todos') {
        list = list.filter((a) => a.profissionalId === profId);
      }
    }

    const filtro = this.filtroStatus();

    if (filtro === 'confirmado') {
      return list.filter((a) => a.status === 'confirmado' || a.status === 'concluido');
    }
    if (filtro === 'aguardando') {
      return list.filter((a) => a.status === 'pendente' || a.status === 'agendado');
    }
    if (filtro === 'recusado') {
      return list.filter((a) => a.status === 'recusado' || a.status === 'cancelado' || a.status === 'no-show');
    }
    return list;
  });

  readonly tituloAgenda = computed(() =>
    this.authService.hasAdminRole() ? 'Agenda Completa' : 'Minha Agenda',
  );

  protected setFiltroStatus(status: FiltroStatus): void {
    this.filtroStatus.set(status);
  }

  /** Horário inicial e final exibidos na visão de Dia, baseados no horário de funcionamento do estabelecimento. */
  readonly dayStartHour = computed(() => {
    const diaSemana = this.viewDate().getDay();
    const config = this.estabelecimentoService.getHorarioDia(diaSemana);
    return config.dayStartHour;
  });

  readonly dayEndHour = computed(() => {
    const diaSemana = this.viewDate().getDay();
    const config = this.estabelecimentoService.getHorarioDia(diaSemana);
    return config.dayEndHour;
  });

  private resizeHandler?: () => void;

  /** Timer de recarga automática da página da agenda. */
  private refreshTimer?: number;

  async ngOnInit() {
    await this.gestaoUsuariosService.carregarUsuarios();
    const user = this.authService.currentUser();
    if (!this.authService.hasAdminRole() && user) {
      this.profissionalIdFiltro.set(user.id);
    }

    this.carregarAgendamentos();
    this.carregarBloqueios();
    this.estabelecimentoService.carregarHorarios();
    this.setupResizeListener();
    this.setupRefreshTimer();
    this.setupVisibilityRefresh();
  }

  ngOnDestroy() {
    if (this.resizeHandler && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.visibilityHandler && isPlatformBrowser(this.platformId)) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  /** Atualiza os agendamentos a cada 1 minuto sem recarregar a página — busca os dados na API
   *  e re-renderiza o calendário no lugar (ex.: criação, confirmação, cancelamento). */
  private setupRefreshTimer(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.refreshTimer = window.setInterval(() => {
      void this.carregarAgendamentos();
    }, REFRESH_INTERVAL_MS);
  }

  /** Atualiza os agendamentos ao voltar para a aba — o cliente pode ter agendado pelo WhatsApp
   *  ou pelo link público enquanto a aba ficou em segundo plano (navegador pausa timers e
   *  eventos de abas em background). */
  private setupVisibilityRefresh(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private readonly visibilityHandler = (): void => {
    if (document.visibilityState === 'visible') {
      void this.carregarAgendamentos();
    }
  };

  /** Carrega os agendamentos reais da API aplicando o filtro por perfil (RF-20). */
  protected async carregarAgendamentos(): Promise<void> {
    const usuario = this.authService.currentUser();
    const ehAdmin = this.authService.hasAdminRole();
    await this.agendaService.carregarAgendamentos(ehAdmin ? undefined : usuario?.id);
  }

  protected async carregarBloqueios(): Promise<void> {
    try {
      const hoje = new Date();
      const inicio = new Date(hoje.getFullYear() - 1, 0, 1).toISOString();
      const fim = new Date(hoje.getFullYear() + 1, 11, 31, 23, 59, 59).toISOString();
      const dados = await this.bloqueioService.listarBloqueios(inicio, fim);
      this.bloqueios.set(dados);
    } catch {
      // Graceful fallback
    }
  }

  /** Configura listener de resize para atualizar isMobile e view ao redimensionar. */
  private setupResizeListener(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.resizeHandler = () => {
      const mobile = this.checkIsMobile();
      const wasMobile = this.isMobile();
      this.isMobile.set(mobile);

      // Só muda a view automaticamente quando há transição entre mobile <-> desktop
      if (wasMobile !== mobile) {
        this.currentView.set(mobile ? CalendarView.Day : CalendarView.Month);
      }
    };

    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  private checkIsMobile(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  private resolveInitialView(): CalendarView {
    if (!isPlatformBrowser(this.platformId)) return CalendarView.Month;
    return window.innerWidth < MOBILE_BREAKPOINT ? CalendarView.Day : CalendarView.Month;
  }

  events = computed<CalendarEvent[]>(() => {
    const agendamentosEvents = this.agendamentosFiltrados().map(a => {
      const primeiroNome = a.clienteNome ? a.clienteNome.trim().split(' ')[0] : '';
      const cor = CORES_STATUS[a.status];
      const inicio = agendamentoParaDateLocal(a.dataInicio);
      const fim = agendamentoParaDateLocal(a.dataFim);
      return {
        id: a.id,
        start: inicio,
        end: fim,
        title: primeiroNome,
        color: {
          primary: cor,
          secondary: cor
        },
        meta: a
      };
    });

    const profIdFiltro = this.profissionalIdFiltro();
    const bloqueiosEvents = this.bloqueios()
      .filter((b) => !b.profissionalId || profIdFiltro === 'todos' || b.profissionalId === profIdFiltro)
      .map((b) => {
        const inicio = new Date(b.dataInicio);
        const fim = new Date(b.dataFim);
        const ehFeriado = b.origem === 'feriado_nacional';
        const prefixo = ehFeriado ? '🚩 Feriado: ' : '🚫 Bloqueio: ';
        return {
          id: `bloqueio-${b.id}`,
          start: inicio,
          end: fim,
          title: `${prefixo}${b.titulo}`,
          allDay: b.diaInteiro,
          color: {
            primary: '#dc3545',
            secondary: '#f8d7da'
          },
          meta: { isBloqueio: true, bloqueio: b }
        };
      });

    return [...agendamentosEvents, ...bloqueiosEvents];
  });

  onDateChange(date: Date) {
    this.viewDate.set(date);
  }

  onViewChange(view: CalendarView | string) {
    this.currentView.set(view as CalendarView);
  }

  onDayClicked(date: Date) {
    this.dataSelecionadaModal.set(date);
    this.showModalDia.set(true);
  }

  onEventClicked(event: CalendarEvent) {
    if (event.start) {
      this.dataSelecionadaModal.set(event.start);
      this.showModalDia.set(true);
    }
  }
}

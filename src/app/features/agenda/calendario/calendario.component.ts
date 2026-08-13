import {
  Component,
  signal,
  ChangeDetectionStrategy,
  inject,
  computed,
  OnInit,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { TmCalendarComponent } from '@techminds-group/tm-angular-lib';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { AgendaService } from '../data-access/agenda.service';
import { AuthService } from '../../../core/services/auth.service';
import { AgendaModalDiaComponent } from '../components/modais/agenda-modal-dia/agenda-modal-dia.component';

import { EstabelecimentoService } from '../../../core/services/estabelecimento.service';

/** Breakpoint Bootstrap md — abaixo disso usa View Dia para melhor legibilidade em mobile. */
const MOBILE_BREAKPOINT = 992;

/**
 * Calendário da agenda interna com modal de gestão de agendamentos por dia (RF-31/D-12/D-13).
 */
@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, TmCalendarComponent, AgendaModalDiaComponent],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarioComponent implements OnInit, OnDestroy {
  private readonly agendaService = inject(AgendaService);
  private readonly authService = inject(AuthService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly platformId = inject(PLATFORM_ID);

  CalendarView = CalendarView;
  viewDate = signal(new Date());

  /** View inicial: Dia em mobile, Mês em desktop. */
  currentView = signal<CalendarView>(this.resolveInitialView());

  /** Indica se o dispositivo atual é mobile (< md Bootstrap). */
  readonly isMobile = signal(this.checkIsMobile());

  /** Estado do Modal de Gestão do Dia */
  protected readonly showModalDia = signal(false);
  protected readonly dataSelecionadaModal = signal<Date | null>(null);

  readonly agendamentosFiltrados = this.agendaService.getAgendamentosFiltrados(this.authService.currentUser());
  readonly tituloAgenda = computed(() =>
    this.authService.hasAdminRole() ? 'Agenda Completa' : 'Minha Agenda',
  );

  // Filtro multi-nível (RF-20): Admin vê todos os agendamentos; Profissional-only vê apenas os seus.
  readonly filtroAtivo = computed(() =>
    this.authService.hasAdminRole() ? 'Todos os agendamentos' : 'Somente os meus',
  );

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

  ngOnInit() {
    this.carregarAgendamentos();
    this.estabelecimentoService.carregarHorarios();
    this.setupResizeListener();
  }

  ngOnDestroy() {
    if (this.resizeHandler && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  /** Carrega os agendamentos reais da API aplicando o filtro por perfil (RF-20). */
  protected async carregarAgendamentos(): Promise<void> {
    const usuario = this.authService.currentUser();
    const ehAdmin = this.authService.hasAdminRole();
    await this.agendaService.carregarAgendamentos(ehAdmin ? undefined : usuario?.id);
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

  events = computed<CalendarEvent[]>(() =>
    this.agendamentosFiltrados().map(a => {
      const primeiroNome = a.clienteNome ? a.clienteNome.trim().split(' ')[0] : '';
      return {
        id: a.id,
        start: a.dataInicio,
        end: a.dataFim,
        title: primeiroNome,
        color: {
          primary: a.corPrimaria || '#0d6efd',
          secondary: a.corPrimaria || '#0d6efd'
        },
        meta: a
      };
    })
  );

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

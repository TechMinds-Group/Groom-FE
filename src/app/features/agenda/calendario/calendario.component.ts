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

/** Breakpoint Bootstrap md — abaixo disso usa View Dia para melhor legibilidade em mobile. */
const MOBILE_BREAKPOINT = 992;

/**
 * Calendário view-only da agenda interna.
 * Em dispositivos móveis (< md Bootstrap / < 992px), inicia em View Dia para melhor legibilidade.
 * View-only: a criação de agendamentos acontece pelo fluxo público (agendamento-publico)
 * ou pelo backend — o drawer local de criação manual foi removido (RF-20 sem ruído de mocks).
 */
@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, TmCalendarComponent],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarioComponent implements OnInit, OnDestroy {
  private readonly agendaService = inject(AgendaService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  CalendarView = CalendarView;
  viewDate = signal(new Date());

  /** View inicial: Dia em mobile, Mês em desktop. */
  currentView = signal<CalendarView>(this.resolveInitialView());

  /** Indica se o dispositivo atual é mobile (< md Bootstrap). */
  readonly isMobile = signal(this.checkIsMobile());

  readonly agendamentosFiltrados = this.agendaService.getAgendamentosFiltrados(this.authService.currentUser());
  readonly tituloAgenda = computed(() =>
    this.authService.hasAdminRole() ? 'Agenda Completa' : 'Minha Agenda',
  );

  // Filtro multi-nível (RF-20): Admin vê todos os agendamentos; Profissional-only vê apenas os seus.
  readonly filtroAtivo = computed(() =>
    this.authService.hasAdminRole() ? 'Todos os agendamentos' : 'Somente os meus',
  );

  private resizeHandler?: () => void;

  ngOnInit() {
    this.carregarAgendamentos();
    this.setupResizeListener();
  }

  ngOnDestroy() {
    if (this.resizeHandler && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.resizeHandler);
    }
  }

  /** Carrega os agendamentos reais da API aplicando o filtro por perfil (RF-20). */
  private async carregarAgendamentos(): Promise<void> {
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
    this.agendamentosFiltrados().map(a => ({
      id: a.id,
      start: a.dataInicio,
      end: a.dataFim,
      title: `${a.clienteNome} - ${a.servicoNome} (${a.profissionalNome})`,
      color: {
        primary: a.corPrimaria || '#0d6efd',
        secondary: a.corPrimaria || '#0d6efd'
      },
      meta: a
    }))
  );

  onDateChange(date: Date) {
    this.viewDate.set(date);
  }

  onViewChange(view: CalendarView | string) {
    this.currentView.set(view as CalendarView);
  }
}

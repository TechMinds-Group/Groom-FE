import { Component, signal, ChangeDetectionStrategy, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmCalendarComponent } from '@techminds-group/tm-angular-lib';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { AgendaService } from '../data-access/agenda.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Calendário mensal view-only da agenda interna.
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
export class CalendarioComponent implements OnInit {
  private readonly agendaService = inject(AgendaService);
  private readonly authService = inject(AuthService);

  CalendarView = CalendarView;
  viewDate = signal(new Date());

  readonly agendamentosFiltrados = this.agendaService.getAgendamentosFiltrados(this.authService.currentUser());
  readonly tituloAgenda = computed(() =>
    this.authService.hasAdminRole() ? 'Agenda Completa' : 'Minha Agenda',
  );

  // Filtro multi-nível (RF-20): Admin vê todos os agendamentos; Profissional-only vê apenas os seus.
  readonly filtroAtivo = computed(() =>
    this.authService.hasAdminRole() ? 'Todos os agendamentos' : 'Somente os meus',
  );

  ngOnInit() {
    this.carregarAgendamentos();
  }

  /** Carrega os agendamentos reais da API aplicando o filtro por perfil (RF-20). */
  private async carregarAgendamentos(): Promise<void> {
    const usuario = this.authService.currentUser();
    const ehAdmin = this.authService.hasAdminRole();
    await this.agendaService.carregarAgendamentos(ehAdmin ? undefined : usuario?.id);
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
}

import { Component, signal, ChangeDetectionStrategy, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { 
  TmCalendarComponent, 
  TmDrawerComponent, 
  TmSelectComponent,
  TmTimeComponent,
  TmSelectOption,
  TmButtonComponent,
  TmModalComponent,
  TmTextComponent
} from '@techminds-group/tm-angular-lib';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { AgendaService } from '../data-access/agenda.service';
import { AuthService } from '../../../core/services/auth.service';
import { addMinutes, setHours, setMinutes } from 'date-fns';

interface ServicoValue {
  nome: string;
  duracao: number;
  preco: number;
  cor: string;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    TmCalendarComponent, 
    TmDrawerComponent, 
    TmSelectComponent, 
    TmTimeComponent,
    TmButtonComponent,
    TmModalComponent,
    TmTextComponent
  ],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarioComponent implements OnInit {
  private agendaService = inject(AgendaService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  
  CalendarView = CalendarView;
  viewDate = signal(new Date());
  showDrawer = signal(false);
  selectedDate = signal<Date | null>(null);
  editingAgendamentoId = signal<string | null>(null);
  showDeleteModal = signal(false);

  readonly agendamentosFiltrados = this.agendaService.getAgendamentosFiltrados(this.authService.currentUser());
  readonly tituloAgenda = computed(() =>
    this.authService.hasAdminRole() ? 'Agenda Completa' : 'Minha Agenda',
  );

  agendaForm!: FormGroup;

  // Mocks
  servicos: TmSelectOption[] = [
    { value: { nome: 'Corte de Cabelo Premium', duracao: 60, preco: 100, cor: '#0d6efd' }, label: 'Corte de Cabelo Premium (R$ 100)' },
    { value: { nome: 'Barba Completa', duracao: 30, preco: 60, cor: '#dc3545' }, label: 'Barba Completa (R$ 60)' },
    { value: { nome: 'Grooming Completo', duracao: 120, preco: 250, cor: '#198754' }, label: 'Grooming Completo (R$ 250)' },
    { value: { nome: 'Corte Kids', duracao: 45, preco: 80, cor: '#6f42c1' }, label: 'Corte Kids (R$ 80)' },
    { value: { nome: 'Tintura', duracao: 90, preco: 150, cor: '#fd7e14' }, label: 'Tintura (R$ 150)' },
  ];

  profissionais: TmSelectOption[] = [
    { value: 'Alexandre', label: 'Alexandre (Mestre Barbeiro)' },
    { value: 'Mariana', label: 'Mariana (Stylist)' },
    { value: 'Roberto', label: 'Roberto (Junior)' },
    { value: 'Juliana', label: 'Juliana (Esteticista)' },
  ];

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    this.agendaForm = this.fb.group({
      clienteNome: ['', [Validators.required, Validators.minLength(3)]],
      clienteTelefone: ['', [Validators.required]],
      servico: [null, [Validators.required]],
      profissional: [null, [Validators.required]],
      hora: ['09:00', [Validators.required]]
    });
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

  logs = signal<string[]>([]);

  onDateChange(date: Date) {
    this.viewDate.set(date);
    this.addLog(`Date changed to: ${date.toLocaleDateString()}`);
  }

  onDayClicked(date: Date) {
    this.selectedDate.set(date);
    this.editingAgendamentoId.set(null);
    
    // Extrai o horário exato que foi clicado no calendário
    const clickedHour = date.getHours().toString().padStart(2, '0');
    const clickedMin = date.getMinutes().toString().padStart(2, '0');
    
    this.agendaForm.patchValue({ 
      hora: `${clickedHour}:${clickedMin}`,
      clienteNome: '',
      clienteTelefone: '',
      servico: null,
      profissional: null
    });

    this.showDrawer.set(true);
    this.addLog(`Day clicked: ${date.toLocaleDateString()} ${clickedHour}:${clickedMin} - Opening Drawer`);
  }

  onSalvar() {
    if (this.agendaForm.invalid || !this.selectedDate()) return;

    const raw = this.agendaForm.value;
    const [hours, minutes] = raw.hora.split(':').map(Number);
    
    const dataInicio = setMinutes(setHours(this.selectedDate()!, hours), minutes);
    const dataFim = addMinutes(dataInicio, raw.servico.duracao);

    const agendamentoData = {
      id: this.editingAgendamentoId() || Math.random().toString(36).substring(2, 9),
      clienteNome: raw.clienteNome,
      clienteTelefone: raw.clienteTelefone,
      servicoNome: raw.servico.nome,
      profissionalNome: raw.profissional,
      dataInicio,
      dataFim,
      status: 'confirmado' as const,
      preco: raw.servico.preco,
      corPrimaria: raw.servico.cor
    };

    if (this.editingAgendamentoId()) {
      this.agendaService.updateAgendamento(agendamentoData);
      this.addLog(`Agendamento atualizado para ${raw.clienteNome}`);
    } else {
      this.agendaService.addAgendamento(agendamentoData);
      this.addLog(`Agendamento criado para ${raw.clienteNome}`);
    }

    this.fecharDrawer();
  }

  confirmarRemover() {
    this.showDeleteModal.set(true);
  }

  onRemover() {
    const id = this.editingAgendamentoId();
    if (id) {
      this.agendaService.removeAgendamento(id);
      this.addLog(`Agendamento removido (ID: ${id})`);
      this.showDeleteModal.set(false);
      this.fecharDrawer();
    }
  }

  fecharDrawer() {
    this.showDrawer.set(false);
    this.editingAgendamentoId.set(null);
    this.agendaForm.reset({ hora: '09:00' });
  }

  toggleDrawer(show: boolean) {
    if (!show) {
      this.fecharDrawer();
    } else {
      this.showDrawer.set(true);
    }
  }

  onEventClicked(event: CalendarEvent) {
    const agendamento = event.meta;
    if (!agendamento) return;

    this.editingAgendamentoId.set(agendamento.id);
    this.selectedDate.set(agendamento.dataInicio);
    
    const clickedHour = agendamento.dataInicio.getHours().toString().padStart(2, '0');
    const clickedMin = agendamento.dataInicio.getMinutes().toString().padStart(2, '0');

    // Encontra o objeto do serviço correspondente
    const servicoOption = this.servicos.find(s => (s.value as ServicoValue).nome === agendamento.servicoNome)?.value;

    this.agendaForm.patchValue({
      clienteNome: agendamento.clienteNome,
      clienteTelefone: agendamento.clienteTelefone,
      servico: servicoOption || null,
      profissional: agendamento.profissionalNome,
      hora: `${clickedHour}:${clickedMin}`
    });

    this.showDrawer.set(true);
    this.addLog(`Event clicked: ${event.title} - Opening for edit`);
  }

  private addLog(msg: string) {
    this.logs.update(l => [msg, ...l].slice(0, 5));
  }
}

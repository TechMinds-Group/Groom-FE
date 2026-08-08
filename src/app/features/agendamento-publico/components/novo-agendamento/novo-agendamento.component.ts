import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { AgendamentoPublico, HorarioDisponivel, ProfissionalDisponivel, ServicoDisponivel } from '../../../../core/models/agendamento-publico/agendamento-publico.model';
import { AGENDAMENTO_PUBLICO_CONFIG } from '../../models/agendamento-publico.config';
import { PassoProfissionalComponent } from './passo-profissional/passo-profissional.component';
import { PassoServicoComponent } from './passo-servico/passo-servico.component';
import { PassoDataHorarioComponent } from './passo-data-horario/passo-data-horario.component';
import { PassoResumoComponent } from './passo-resumo/passo-resumo.component';
import { ConfirmacaoComponent } from './confirmacao/confirmacao.component';

@Component({
  selector: 'app-novo-agendamento',
  standalone: true,
  imports: [
    MatProgressBarModule,
    PassoProfissionalComponent,
    PassoServicoComponent,
    PassoDataHorarioComponent,
    PassoResumoComponent,
    ConfirmacaoComponent,
  ],
  templateUrl: './novo-agendamento.component.html',
  styleUrl: './novo-agendamento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovoAgendamentoComponent implements OnInit {
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);

  readonly config = AGENDAMENTO_PUBLICO_CONFIG;

  readonly passo = signal(1);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly profissionais = signal<ProfissionalDisponivel[]>([]);
  readonly servicos = signal<ServicoDisponivel[]>([]);
  readonly horarios = signal<HorarioDisponivel[]>([]);

  readonly profissionalSelecionado = signal<ProfissionalDisponivel | null>(null);
  readonly servicoSelecionado = signal<ServicoDisponivel | null>(null);
  readonly dataSelecionada = signal<string | null>(null);
  readonly horarioSelecionado = signal<string | null>(null);
  readonly agendamentoConfirmado = signal<AgendamentoPublico | null>(null);

  async ngOnInit(): Promise<void> {
    await this.carregarProfissionais();
  }

  async carregarProfissionais(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      this.profissionais.set(await this.agendamentoPublicoService.getProfissionais());
    } catch {
      this.errorMessage.set('Não foi possível carregar os profissionais. Tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async selecionarProfissional(profissional: ProfissionalDisponivel): Promise<void> {
    this.profissionalSelecionado.set(profissional);
    this.servicoSelecionado.set(null);
    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.servicos.set([]);
    this.horarios.set([]);
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      this.servicos.set(await this.agendamentoPublicoService.getServicosProfissional(profissional.id));
      this.passo.set(2);
    } catch {
      this.errorMessage.set('Não foi possível carregar os serviços. Tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  selecionarServico(servico: ServicoDisponivel): void {
    this.servicoSelecionado.set(servico);
    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.horarios.set([]);
    this.passo.set(3);
  }

  async carregarHorarios(data: string): Promise<void> {
    const profissional = this.profissionalSelecionado();
    const servico = this.servicoSelecionado();
    if (!profissional || !servico) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      this.horarios.set(await this.agendamentoPublicoService.getHorarios(profissional.id, data, servico.id));
    } catch {
      this.errorMessage.set('Não foi possível carregar os horários. Tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  selecionarData(data: string): void {
    this.dataSelecionada.set(data);
    this.horarioSelecionado.set(null);
    void this.carregarHorarios(data);
  }

  selecionarHorario(horario: string): void {
    this.horarioSelecionado.set(horario);
    this.passo.set(4);
  }

  async confirmar(): Promise<void> {
    const profissional = this.profissionalSelecionado();
    const servico = this.servicoSelecionado();
    const data = this.dataSelecionada();
    const horario = this.horarioSelecionado();
    if (!profissional || !servico || !data || !horario) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const agendamento = await this.agendamentoPublicoService.criarAgendamento({
        profissionalId: profissional.id,
        servicoId: servico.id,
        dataInicio: `${data}T${horario}:00`,
      });
      this.agendamentoConfirmado.set(agendamento);
      this.passo.set(5);
    } catch {
      this.errorMessage.set('Não foi possível concluir o agendamento. Tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  voltar(): void {
    const atual = this.passo();
    if (atual > 1) {
      this.passo.set(atual - 1);
    }
  }

  reiniciar(): void {
    this.passo.set(1);
    this.profissionalSelecionado.set(null);
    this.servicoSelecionado.set(null);
    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.agendamentoConfirmado.set(null);
    this.horarios.set([]);
  }
}

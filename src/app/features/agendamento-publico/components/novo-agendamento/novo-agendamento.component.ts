import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { AgendamentoPublico, HorarioDisponivel, ProfissionalDisponivel, ServicoDisponivel } from '../../../../core/models/agendamento-publico/agendamento-publico.model';
import { AGENDAMENTO_PUBLICO_CONFIG } from '../../models/agendamento-publico.config';
import { TemaPublicoService } from '../../services/tema-publico.service';
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
export class NovoAgendamentoComponent implements OnInit, OnDestroy {
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly router = inject(Router);

  /** Aplica o tema do dispositivo (claro/escuro) na tela pública. */
  private readonly temaPublico = inject(TemaPublicoService);

  /** Tema ativo (claro/escuro) para exibir o ícone sol/lua correspondente. */
  readonly temaAtivo = this.temaPublico.tema;

  readonly config = AGENDAMENTO_PUBLICO_CONFIG;

  readonly passo = signal(1);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly profissionais = signal<ProfissionalDisponivel[]>([]);
  readonly servicos = signal<ServicoDisponivel[]>([]);
  readonly horarios = signal<HorarioDisponivel[]>([]);
  /** Dias da semana (0-6) em que o profissional atende — habilita o calendário. */
  readonly diasDisponiveis = signal<number[]>([]);

  readonly profissionalSelecionado = signal<ProfissionalDisponivel | null>(null);
  readonly servicoSelecionado = signal<ServicoDisponivel | null>(null);
  readonly dataSelecionada = signal<string | null>(null);
  readonly horarioSelecionado = signal<string | null>(null);
  readonly agendamentoConfirmado = signal<AgendamentoPublico | null>(null);

  /** Etapas do fluxo de agendamento (stepper). */
  readonly steps = [
    { numero: 1, label: 'Profissional', icon: 'fa-solid fa-user' },
    { numero: 2, label: 'Serviço', icon: 'fa-solid fa-scissors' },
    { numero: 3, label: 'Data e hora', icon: 'fa-solid fa-calendar-days' },
    { numero: 4, label: 'Confirmação', icon: 'fa-solid fa-file-circle-check' },
  ] as const;

  /** Total do serviço selecionado (resumo lateral). */
  readonly totalServico = computed(() => this.servicoSelecionado()?.preco ?? null);

  formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatarData(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  async ngOnInit(): Promise<void> {
    await this.carregarProfissionais();
  }

  ngOnDestroy(): void {
    this.temaPublico.restaurarTemaAnterior();
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
    this.diasDisponiveis.set([]);
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const [servicos, disponibilidade] = await Promise.all([
        this.agendamentoPublicoService.getServicosProfissional(profissional.id),
        this.agendamentoPublicoService.getDisponibilidadeSemanal(profissional.id),
      ]);
      this.servicos.set(servicos);
      this.diasDisponiveis.set(
        disponibilidade.filter((d) => d.trabalhaHoje && d.intervalos.length > 0).map((d) => d.diaSemana),
      );
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

  /**
   * Navega para um step clicado no stepper.
   * Voltar para steps anteriores é sempre permitido; avançar exige que as
   * seleções dos steps intermediários já existam (ex: ir ao passo 4 sem data/horário).
   */
  navegarParaStep(numero: number): void {
    if (numero === this.passo()) {
      return;
    }

    if (numero > this.passo() && !this.passoNavegavel(numero)) {
      return;
    }

    this.passo.set(numero);
    this.errorMessage.set(null);
  }

  /** Indica se o step informado pode ser acessado por clique (pré-condições satisfeitas). */
  passoNavegavel(numero: number): boolean {
    const profissional = this.profissionalSelecionado();
    const servico = this.servicoSelecionado();

    if (numero === 1) {
      return true;
    }

    if (numero === 2) {
      return profissional !== null;
    }

    if (numero === 3) {
      return profissional !== null && servico !== null;
    }

    return profissional !== null && servico !== null && this.dataSelecionada() !== null && this.horarioSelecionado() !== null;
  }

  reiniciar(): void {
    this.passo.set(1);
    this.profissionalSelecionado.set(null);
    this.servicoSelecionado.set(null);
    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.agendamentoConfirmado.set(null);
    this.horarios.set([]);
    this.diasDisponiveis.set([]);
  }

  readonly clienteLogado = this.agendamentoPublicoService.clienteLogado;

  /** Alterna entre tema claro e escuro na tela pública. */
  alternarTema(): void {
    this.temaPublico.alternarTema();
  }

  async sair(): Promise<void> {
    await this.agendamentoPublicoService.logout();
    await this.router.navigate(['/agendamento', this.agendamentoPublicoService.estabelecimento() ?? '', 'login']);
  }
}

import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import {
  LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip,
  DoughnutController, ArcElement, Legend, BarController, BarElement, PieController
} from 'chart.js';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { AssinantesService } from '../../core/services/assinantes.service';
import { ClubesService } from '../../core/services/clubes.service';
import { ThemeService } from '../../core/services/theme.service';
import { AgendamentosService } from '../../core/services/agendamentos.service';
import { GestaoUsuariosService } from '../../core/services/gestao-usuarios.service';

export type FiltroPeriodo = 'hoje' | '7d' | '30d' | '90d' | 'mes' | 'ano';
export type AbaDashboard = 'desempenho' | 'previsao';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  providers: [
    provideCharts({
      registerables: [
        LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip,
        DoughnutController, ArcElement, Legend, BarController, BarElement, PieController
      ]
    })
  ],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioComponent implements OnInit, OnDestroy {
  protected readonly assinantesService = inject(AssinantesService);
  protected readonly clubesService = inject(ClubesService);
  protected readonly themeService = inject(ThemeService);
  protected readonly agendamentosService = inject(AgendamentosService);
  protected readonly gestaoUsuariosService = inject(GestaoUsuariosService);

  /** ABA ATIVA DA DASHBOARD ('desempenho' | 'previsao') */
  public abaAtiva = signal<AbaDashboard>('desempenho');

  /** FILTROS GLOBAIS ENXUTOS (Padrão: Hoje) */
  public filtroPeriodo = signal<FiltroPeriodo>('hoje');
  public filtroProfissionalId = signal<string>('todos');

  /** SIMULADOR PREDITIVO DE CRESCIMENTO */
  public simularNovosAssinantes = signal<number>(10);
  public simularAumentoTicketPct = signal<number>(0);

  /** EXIBIÇÃO DO POPOVER EXPLICATIVO DA RETENÇÃO DE CLIENTES */
  public exibeAjudaReincidencia = signal<boolean>(false);

  public toggleAjudaReincidencia(event: MouseEvent): void {
    event.stopPropagation();
    this.exibeAjudaReincidencia.update((v) => !v);
  }

  @HostListener('document:click')
  protected fecharPopoversAoClicarFora(): void {
    if (this.exibeAjudaReincidencia()) {
      this.exibeAjudaReincidencia.set(false);
    }
  }

  /** Lista de Profissionais cadastrados para os Filtros */
  protected readonly profissionais = computed(() => this.gestaoUsuariosService.usuarios());

  /** Todos os Agendamentos */
  protected readonly todosAgendamentos = computed(() => this.agendamentosService.agendamentos());

  /** Data limite inicial com base no Filtro de Período selecionado */
  protected readonly dataInicioFiltro = computed(() => {
    const agora = new Date();
    const p = this.filtroPeriodo();
    if (p === 'hoje') return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0);
    if (p === '7d') return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 7);
    if (p === '30d') return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 30);
    if (p === '90d') return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 90);
    if (p === 'mes') return new Date(agora.getFullYear(), agora.getMonth(), 1);
    if (p === 'ano') return new Date(agora.getFullYear(), 0, 1);
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0);
  });

  /** Agendamentos filtrados por Período e Profissional */
  protected readonly agendamentosFiltrados = computed(() => {
    const p = this.filtroPeriodo();
    const inicio = this.dataInicioFiltro();
    const profId = this.filtroProfissionalId();

    const agora = new Date();
    const fimHoje = p === 'hoje' ? new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999) : null;

    return this.todosAgendamentos().filter(a => {
      if (a.dataInicio < inicio) return false;
      if (fimHoje && a.dataInicio > fimHoje) return false;
      if (profId !== 'todos' && a.profissionalId !== profId) return false;
      return true;
    });
  });

  /** Agendamentos Atendidos / Concluídos no Período Filtrado */
  protected readonly agendamentosAtendidos = computed(() => {
    const agora = new Date();
    return this.agendamentosFiltrados().filter(a => {
      const st = a.status;
      if (st === 'nao_compareceu' || st === 'cancelado' || st === 'recusado' || st === 'no-show') return false;
      if (st === 'concluido') return true;
      return a.dataInicio <= agora;
    });
  });

  /** Lista ordenada de todos os agendamentos do dia atual (Hoje) */
  protected readonly agendamentosHoje = computed(() => {
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999);
    const profId = this.filtroProfissionalId();

    return this.todosAgendamentos()
      .filter(a => {
        if (a.dataInicio < inicioDia || a.dataInicio > fimDia) return false;
        if (profId !== 'todos' && a.profissionalId !== profId) return false;
        return true;
      })
      .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
  });

  /** Resumo estatístico e financeiro do dia atual */
  protected readonly resumoHoje = computed(() => {
    const lista = this.agendamentosHoje();
    const totalQtd = lista.length;

    const concluidos = lista.filter(a => a.status === 'concluido');
    const pendentes = lista.filter(a => a.status === 'agendado' || a.status === 'confirmado' || a.status === 'pendente');
    const canceladosFaltas = lista.filter(a => a.status === 'cancelado' || a.status === 'recusado' || a.status === 'nao_compareceu' || a.status === 'no-show');

    const faturamentoRealizado = concluidos.reduce((sum, a) => sum + (a.preco || 0), 0);
    const faturamentoPendente = pendentes.reduce((sum, a) => sum + (a.preco || 0), 0);
    const faturamentoTotalPrevisto = faturamentoRealizado + faturamentoPendente;

    return {
      totalQtd,
      concluidosQtd: concluidos.length,
      pendentesQtd: pendentes.length,
      canceladosFaltasQtd: canceladosFaltas.length,
      faturamentoRealizadoVal: faturamentoRealizado,
      faturamentoRealizadoFormatted: `R$ ${faturamentoRealizado.toFixed(2).replace('.', ',')}`,
      faturamentoPendenteVal: faturamentoPendente,
      faturamentoPendenteFormatted: `R$ ${faturamentoPendente.toFixed(2).replace('.', ',')}`,
      faturamentoTotalPrevistoVal: faturamentoTotalPrevisto,
      faturamentoTotalPrevistoFormatted: `R$ ${faturamentoTotalPrevisto.toFixed(2).replace('.', ',')}`,
    };
  });

  /** Rótulo legível do filtro de período selecionado */
  protected readonly filtroPeriodoRotulo = computed(() => {
    const p = this.filtroPeriodo();
    if (p === 'hoje') return 'Hoje';
    if (p === '7d') return 'Últimos 7 dias';
    if (p === '30d') return 'Últimos 30 dias';
    if (p === '90d') return 'Últimos 90 dias';
    if (p === 'mes') return 'Este Mês';
    if (p === 'ano') return 'Ano Atual';
    return 'Período Selecionado';
  });

  /** Faturamento total dos Atendimentos Realizados no Período */
  protected readonly faturamentoAtendimentosVal = computed(() =>
    this.agendamentosAtendidos().reduce((sum, a) => sum + (a.preco || 0), 0)
  );

  /** Assinantes Ativos e MRR */
  protected readonly totalAssinantes = computed(() => this.assinantesService.assinantes().length);
  protected readonly assinantesAtivos = computed(() =>
    this.assinantesService.assinantes().filter(a => a.status === 'Ativo')
  );

  protected readonly faturamentoMensalVal = computed(() =>
    this.assinantesAtivos().reduce((sum, a) => sum + a.valor, 0)
  );

  /** Faturamento Total Dinâmico de Acordo com o Período Selecionado */
  protected readonly faturamentoTotalCombinadoVal = computed(() => {
    const p = this.filtroPeriodo();
    const atendimentosVal = this.faturamentoAtendimentosVal();
    const mrr = this.faturamentoMensalVal();

    if (p === 'hoje') {
      const resumo = this.resumoHoje();
      const receitaAssinaturasHoje = mrr / 30;
      return resumo.faturamentoTotalPrevistoVal + receitaAssinaturasHoje;
    }
    if (p === '7d') {
      return atendimentosVal + ((mrr / 30) * 7);
    }
    if (p === '90d') {
      return atendimentosVal + (mrr * 3);
    }
    if (p === 'ano') {
      return atendimentosVal + (mrr * 12);
    }
    // mes ou 30d
    return atendimentosVal + mrr;
  });

  protected readonly faturamentoTotalCombinadoFormatted = computed(() =>
    `R$ ${this.faturamentoTotalCombinadoVal().toFixed(2).replace('.', ',')}`
  );

  /** Ticket Médio por Assinante (ARPU) */
  protected readonly ticketMedioVal = computed(() => {
    const count = this.assinantesAtivos().length;
    return count > 0 ? this.faturamentoMensalVal() / count : 0;
  });

  protected readonly ticketMedioFormatted = computed(() =>
    `R$ ${this.ticketMedioVal().toFixed(2).replace('.', ',')}`
  );

  /** Formatador de Horários HH:mm para exibição */
  protected formatarHora(data: Date | string): string {
    const d = typeof data === 'string' ? new Date(data) : data;
    if (!d || isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  /** Retorna a data de hoje formatada por extenso */
  protected formatarDataHojeExtenso(): string {
    const hoje = new Date();
    const str = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Retorna classes CSS e rótulo traduzido do status do agendamento */
  protected obterStatusInfo(status: string): { label: string; class: string; icon: string } {
    const st = status?.toLowerCase() ?? '';
    if (st === 'concluido') return { label: 'Concluído', class: 'bg-success-subtle text-success border border-success-subtle', icon: 'fa-check-circle' };
    if (st === 'confirmado') return { label: 'Confirmado', class: 'bg-primary-subtle text-primary border border-primary-subtle', icon: 'fa-user-check' };
    if (st === 'agendado' || st === 'pendente') return { label: 'Pendente', class: 'bg-warning-subtle text-warning border border-warning-subtle', icon: 'fa-clock' };
    if (st === 'cancelado' || st === 'recusado') return { label: 'Cancelado', class: 'bg-danger-subtle text-danger border border-danger-subtle', icon: 'fa-times-circle' };
    if (st === 'nao_compareceu' || st === 'no-show') return { label: 'Falta (No-show)', class: 'bg-secondary-subtle text-secondary border border-secondary-subtle', icon: 'fa-user-slash' };
    return { label: 'Confirmado', class: 'bg-primary-subtle text-primary border border-primary-subtle', icon: 'fa-user-check' };
  }

  /** Taxa de Ocupação da Equipe no Dia Atual (%) */
  protected readonly ocupacaoHojePct = computed(() => {
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

    const agendamentosHoje = this.todosAgendamentos().filter(a =>
      a.dataInicio >= inicioDia && a.dataInicio <= fimDia &&
      a.status !== 'cancelado' && a.status !== 'recusado'
    );

    const numProfissionais = Math.max(1, this.profissionais().length);
    const capacidadeMaxMinutos = numProfissionais * 8 * 60; // 8h por barbeiro por dia
    const minutosOcupados = agendamentosHoje.length * 30; // 30min por slot

    return Math.min(100, Math.round((minutosOcupados / capacidadeMaxMinutos) * 100));
  });

  /** RANKING DE PROFISSIONAIS MAIS PRODUTIVOS (ABA 1) */
  protected readonly rankingProfissionais = computed(() => {
    const mapa = new Map<string, { id: string; nome: string; quantidade: number; faturamento: number }>();
    const atendidos = this.agendamentosAtendidos();

    for (const a of atendidos) {
      const id = a.profissionalId || 'sem_id';
      const nome = a.profissionalNome || 'Profissional';
      const atual = mapa.get(id) || { id, nome, quantidade: 0, faturamento: 0 };
      atual.quantidade++;
      atual.faturamento += (a.preco || 0);
      mapa.set(id, atual);
    }

    return Array.from(mapa.values()).sort((a, b) => b.faturamento - a.faturamento);
  });

  /** RANKING DE SERVIÇOS MAIS PROCURADOS (ABA 1) */
  protected readonly rankingServicos = computed(() => {
    const mapa = new Map<string, { nome: string; quantidade: number; faturamento: number }>();
    const atendidos = this.agendamentosAtendidos();

    for (const a of atendidos) {
      const nome = a.servicoNome || 'Serviço';
      const atual = mapa.get(nome) || { nome, quantidade: 0, faturamento: 0 };
      atual.quantidade++;
      atual.faturamento += (a.preco || 0);
      mapa.set(nome, atual);
    }

    return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
  });

  /** LISTA DE FALTAS E CANCELAMENTOS REINCIDENTES (ABA 2) */
  protected readonly clientesFaltasECancelamentos = computed(() => {
    const mapa = new Map<string, { nome: string; telefone: string; faltas: number; cancelamentos: number; total: number }>();

    for (const a of this.todosAgendamentos()) {
      if (a.status === 'nao_compareceu' || a.status === 'no-show' || a.status === 'cancelado' || a.status === 'recusado') {
        const key = a.clienteNome.toLowerCase().trim();
        const atual = mapa.get(key) || { nome: a.clienteNome, telefone: a.clienteTelefone, faltas: 0, cancelamentos: 0, total: 0 };
        if (a.status === 'nao_compareceu' || a.status === 'no-show') {
          atual.faltas++;
        } else {
          atual.cancelamentos++;
        }
        atual.total++;
        mapa.set(key, atual);
      }
    }

    return Array.from(mapa.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  });

  /** SIMULADOR PREDITIVO DE METAS & CRESCIMENTO (ABA 2) */
  protected readonly resultadoSimulacao = computed(() => {
    const mrrAtual = this.faturamentoMensalVal();
    const ticketAtual = this.ticketMedioVal() || 90;

    const novosAssinantes = this.simularNovosAssinantes();
    const aumentoTicketPct = this.simularAumentoTicketPct();

    const novoTicket = ticketAtual * (1 + (aumentoTicketPct / 100));
    const mrrProjetado = (this.assinantesAtivos().length + novosAssinantes) * novoTicket;

    const ganhoMensal = mrrProjetado - mrrAtual;
    const projecao3Meses = mrrAtual + (ganhoMensal * 3);
    const projecao6Meses = mrrAtual + (ganhoMensal * 6);
    const projecao12Meses = mrrProjetado * 12;

    return {
      mrrProjetadoFormatted: `R$ ${mrrProjetado.toFixed(2).replace('.', ',')}`,
      ganhoMensalFormatted: `+R$ ${ganhoMensal.toFixed(2).replace('.', ',')}/mês`,
      projecao3MesesFormatted: `R$ ${projecao3Meses.toFixed(2).replace('.', ',')}`,
      projecao6MesesFormatted: `R$ ${projecao6Meses.toFixed(2).replace('.', ',')}`,
      projecao12MesesFormatted: `R$ ${projecao12Meses.toFixed(2).replace('.', ',')}`,
    };
  });

  /** Agendamentos Futuros Já Confirmados */
  protected readonly agendamentosFuturosConfirmados = computed(() => {
    const agora = new Date();
    const futuros = this.todosAgendamentos().filter(a =>
      a.dataInicio > agora && (a.status === 'confirmado' || a.status === 'agendado')
    );
    const valorFuturo = futuros.reduce((sum, a) => sum + (a.preco || 0), 0);
    return {
      qtd: futuros.length,
      valorFormatted: `R$ ${valorFuturo.toFixed(2).replace('.', ',')}`
    };
  });

  /** Renovações nos Próximos 30 Dias */
  protected readonly renovacoesProximos30Dias = computed(() => {
    const ativos = this.assinantesAtivos();
    const proximos = ativos.filter(a => a.diasRestantes !== undefined && a.diasRestantes <= 30);
    const totalValor = proximos.reduce((sum, a) => sum + a.valor, 0);
    return {
      qtd: proximos.length,
      valorFormatted: `R$ ${totalValor.toFixed(2).replace('.', ',')}`
    };
  });

  // --- GRÁFICOS CHART.JS COM CORES PADRONIZADAS DO SISTEMA ---

  /** 1. Evolução do Faturamento & Projeção (Line Chart) */
  protected readonly lineData = computed(() => {
    const ativos = this.assinantesAtivos();
    const labels: string[] = [];
    const dataReal: (number | null)[] = [];
    const dataProjecao: (number | null)[] = [];
    const hoje = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      labels.push(label.charAt(0).toUpperCase() + label.slice(1, 3));

      const fimDoMes = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const totalMes = ativos
        .filter(a => new Date(a.dataInicio) <= fimDoMes)
        .reduce((sum, a) => sum + a.valor, 0);

      dataReal.push(totalMes);
      dataProjecao.push(null);
    }

    const valorAtual = dataReal[5] ?? 0;
    dataProjecao[5] = valorAtual;

    for (let i = 1; i <= 3; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }) + ' (Prev.)';
      labels.push(label.charAt(0).toUpperCase() + label.slice(1, 3));

      dataReal.push(null);
      const incremento = Math.round(valorAtual * (1 + (i * 0.08)));
      dataProjecao.push(incremento);
    }

    return { labels, dataReal, dataProjecao };
  });

  public lineChartData = computed<ChartData<'line'>>(() => {
    const isDark = this.themeService.isDarkMode();
    const primaryColor = isDark ? '#60a5fa' : '#0d6efd';
    const forecastColor = '#198754';
    const { labels, dataReal, dataProjecao } = this.lineData();

    return {
      labels,
      datasets: [
        {
          data: dataReal,
          label: 'Faturamento Histórico Real',
          fill: true,
          tension: 0.4,
          borderColor: primaryColor,
          backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(13, 110, 253, 0.08)',
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          data: dataProjecao,
          label: 'Projeção Preditiva',
          fill: false,
          tension: 0.4,
          borderDash: [6, 6],
          borderColor: forecastColor,
          backgroundColor: 'transparent',
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: forecastColor
        }
      ]
    };
  });

  public lineChartOptions = computed<ChartConfiguration['options']>(() => {
    const isDark = this.themeService.isDarkMode();
    const textColor = isDark ? '#cbd5e1' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: textColor, usePointStyle: true, boxWidth: 8 }
        }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    };
  });

  /** 2. Atendimentos vs Cancelamentos vs Faltas (Bar Chart - Cores Padrão) */
  public barChartData = computed<ChartData<'bar'>>(() => {
    const agendamentos = this.agendamentosFiltrados();

    const concluidos = agendamentos.filter(a => a.status === 'concluido' || a.status === 'confirmado').length;
    const cancelados = agendamentos.filter(a => a.status === 'cancelado' || a.status === 'recusado').length;
    const faltas = agendamentos.filter(a => a.status === 'nao_compareceu' || a.status === 'no-show').length;

    return {
      labels: ['Concluídos / Confirmados', 'Cancelados / Recusados', 'Faltas'],
      datasets: [
        {
          label: 'Agendamentos',
          data: [concluidos, cancelados, faltas],
          backgroundColor: ['#198754', '#ef4444', '#ffc107'],
          borderRadius: 8,
        }
      ]
    };
  });

  public barChartOptions = computed<ChartConfiguration['options']>(() => {
    const isDark = this.themeService.isDarkMode();
    const textColor = isDark ? '#cbd5e1' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor } },
        y: { grid: { color: gridColor }, ticks: { color: textColor } }
      }
    };
  });

  /** 3. Mix de Receita (Pie Chart - Cores Padrão) */
  public pieMixChartData = computed<ChartData<'pie'>>(() => {
    const mrr = this.faturamentoMensalVal();
    const avulso = this.faturamentoAtendimentosVal();

    return {
      labels: ['Receita Recorrente (Planos)', 'Receita Avulsa (Serviços)'],
      datasets: [
        {
          data: [mrr, avulso],
          backgroundColor: ['#0d6efd', '#0dcaf0'],
          hoverOffset: 6
        }
      ]
    };
  });

  public pieMixChartOptions = computed<ChartConfiguration['options']>(() => {
    const isDark = this.themeService.isDarkMode();
    const textColor = isDark ? '#cbd5e1' : '#64748b';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor } }
      }
    };
  });

  /** 4. Distribuição por Plano (Doughnut Chart - Paleta Padrão) */
  public doughnutChartData = computed<ChartData<'doughnut'>>(() => {
    const clubes = this.clubesService.clubes();
    const ativos = this.assinantesAtivos();
    const labels = clubes.map(c => c.nome);
    const data = clubes.map(c => ativos.filter(a => a.clubeId === c.id).length);
    const colors = ['#0d6efd', '#198754', '#ffc107', '#ef4444', '#6f42c1', '#0dcaf0'];

    return {
      labels,
      datasets: [{ data, backgroundColor: colors }]
    };
  });

  public doughnutChartOptions = computed<ChartConfiguration['options']>(() => {
    const isDark = this.themeService.isDarkMode();
    const textColor = isDark ? '#cbd5e1' : '#64748b';

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor } }
      }
    };
  });

  ngOnInit(): void {
    this.assinantesService.carregarAssinantes();
    this.clubesService.carregarClubes().subscribe();
    this.agendamentosService.carregarAgendamentos();
    void this.gestaoUsuariosService.carregarUsuarios();
  }

  ngOnDestroy(): void {}
}

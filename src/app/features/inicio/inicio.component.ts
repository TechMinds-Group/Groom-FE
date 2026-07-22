import { ChangeDetectionStrategy, Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import {
  LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip,
  DoughnutController, ArcElement, Legend
} from 'chart.js';
import type { ChartConfiguration, ChartData } from 'chart.js';
import { AssinantesService } from '../../core/services/assinantes.service';
import { ClubesService } from '../../core/services/clubes.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [provideCharts({ registerables: [LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, DoughnutController, ArcElement, Legend] })],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioComponent implements OnInit {
  protected readonly assinantesService = inject(AssinantesService);
  protected readonly clubesService = inject(ClubesService);
  protected readonly themeService = inject(ThemeService);

  protected readonly totalAssinantes = computed(() => this.assinantesService.assinantes().length);

  protected readonly assinantesAtivos = computed(() =>
    this.assinantesService.assinantes().filter(a => a.status === 'Ativo')
  );

  protected readonly faturamentoMensal = computed(() => {
    const total = this.assinantesAtivos().reduce((sum, a) => sum + a.valor, 0);
    return `R$ ${total.toFixed(2).replace('.', ',')}`;
  });

  protected readonly totalPlanos = computed(() => this.clubesService.clubes().length);

  protected readonly lineData = computed(() => {
    const ativos = this.assinantesAtivos();
    const labels: string[] = [];
    const data: number[] = [];
    const hoje = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      labels.push(label.charAt(0).toUpperCase() + label.slice(1, 3));

      const fimDoMes = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const totalMes = ativos
        .filter(a => new Date(a.dataInicio) <= fimDoMes)
        .reduce((sum, a) => sum + a.valor, 0);

      data.push(totalMes);
    }

    return { labels, data };
  });

  public lineChartData = computed<ChartData<'line'>>(() => {
    const isDark = this.themeService.isDarkMode();
    const primaryColor = '#0d6efd';
    const accentColor = '#ffee00';
    const { labels, data } = this.lineData();

    return {
      labels,
      datasets: [
        {
          data,
          label: 'Faturamento Estimado',
          fill: true,
          tension: 0.4,
          borderColor: isDark ? accentColor : primaryColor,
          backgroundColor: isDark ? 'rgba(255, 238, 0, 0.1)' : 'rgba(13, 110, 253, 0.1)'
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
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor }
        }
      }
    };
  });

  public doughnutChartData = computed<ChartData<'doughnut'>>(() => {
    const clubes = this.clubesService.clubes();
    const ativos = this.assinantesAtivos();
    const labels = clubes.map(c => c.nome);
    const data = clubes.map(c =>
      ativos.filter(a => a.clubeId === c.id).length
    );
    const colors = ['#0d6efd', '#ffee00', '#198754', '#ef4444', '#0dcaf0', '#6c757d'];

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
        legend: {
          labels: { color: textColor }
        }
      }
    };
  });

  ngOnInit(): void {
    this.assinantesService.carregarAssinantes();
    this.clubesService.carregarClubes().subscribe();
  }
}

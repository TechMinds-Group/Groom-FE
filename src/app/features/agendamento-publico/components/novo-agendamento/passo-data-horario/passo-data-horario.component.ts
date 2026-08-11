import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { HorarioDisponivel, ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';

interface DiaCalendario {
  date: Date;
  vazio: boolean;
  habilitado: boolean;
  selecionado: boolean;
  hoje: boolean;
}

@Component({
  selector: 'app-passo-data-horario',
  standalone: true,
  imports: [],
  templateUrl: './passo-data-horario.component.html',
  styleUrl: './passo-data-horario.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassoDataHorarioComponent {
  readonly servico = input.required<ServicoDisponivel | null>();
  readonly horarios = input.required<HorarioDisponivel[]>();
  /** Dias da semana (0 = Domingo ... 6 = Sábado) em que o profissional atende. */
  readonly diasDisponiveis = input<number[]>([]);
  readonly dataSelecionada = input<string | null>(null);
  readonly horarioSelecionado = input<string | null>(null);
  readonly isLoading = input(false);

  readonly dataSelecionadaChange = output<string>();
  readonly horarioSelecionadoChange = output<string>();

  protected readonly hoje = new Date();
  protected readonly diasSemanaRotulo = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  protected readonly mesExibido = signal(this.inicioDoMes(this.hoje));

  protected readonly tituloMes = computed(() => {
    const mes = this.mesExibido();
    return mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  });

  protected readonly mesAnteriorBloqueado = computed(() => {
    const mes = this.mesExibido();
    return mes.getFullYear() === this.hoje.getFullYear() && mes.getMonth() === this.hoje.getMonth();
  });

  protected readonly diasCalendario = computed<DiaCalendario[]>(() => {
    const mes = this.mesExibido();
    const offset = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay();
    const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const inicioHoje = this.inicioDoDia(this.hoje);
    const diasDisponiveis = this.diasDisponiveis();

    const dias: DiaCalendario[] = [];
    for (let i = 0; i < offset; i++) {
      dias.push({ date: new Date(0), vazio: true, habilitado: false, selecionado: false, hoje: false });
    }
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const date = new Date(mes.getFullYear(), mes.getMonth(), dia);
      const habilitado = diasDisponiveis.includes(date.getDay()) && date >= inicioHoje;
      dias.push({
        date,
        vazio: false,
        habilitado,
        selecionado: this.dataSelecionada() === this.toIso(date),
        hoje: date.getTime() === inicioHoje.getTime(),
      });
    }
    return dias;
  });

  navegarMes(delta: number): void {
    const mes = this.mesExibido();
    this.mesExibido.set(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));
  }

  selecionarDia(dia: DiaCalendario): void {
    if (dia.habilitado) {
      this.dataSelecionadaChange.emit(this.toIso(dia.date));
    }
  }

  onHorarioChange(horario: HorarioDisponivel): void {
    if (horario.disponivel) {
      this.horarioSelecionadoChange.emit(horario.hora);
    }
  }

  calcularFim(horario: string): string {
    const duracao = this.servico()?.duracao ?? 30;
    const [hora, minuto] = horario.split(':').map(Number);
    const fim = new Date(2000, 0, 1, hora, minuto + duracao);
    return `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;
  }

  private inicioDoMes(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private inicioDoDia(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private toIso(date: Date): string {
    const ano = String(date.getFullYear()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}

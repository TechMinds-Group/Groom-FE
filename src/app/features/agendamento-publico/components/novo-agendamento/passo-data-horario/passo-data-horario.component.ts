import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HorarioDisponivel, ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';

@Component({
  selector: 'app-passo-data-horario',
  standalone: true,
  templateUrl: './passo-data-horario.component.html',
  styleUrl: './passo-data-horario.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassoDataHorarioComponent {
  readonly servico = input.required<ServicoDisponivel | null>();
  readonly horarios = input.required<HorarioDisponivel[]>();
  readonly dataSelecionada = input<string | null>(null);
  readonly horarioSelecionado = input<string | null>(null);
  readonly isLoading = input(false);

  readonly dataSelecionadaChange = output<string>();
  readonly horarioSelecionadoChange = output<string>();

  readonly hoje = new Date().toISOString().slice(0, 10);

  onDataChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.dataSelecionadaChange.emit(value);
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
}

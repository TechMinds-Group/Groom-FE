import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProfissionalDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';

@Component({
  selector: 'app-passo-profissional',
  standalone: true,
  templateUrl: './passo-profissional.component.html',
  styleUrl: './passo-profissional.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassoProfissionalComponent {
  readonly profissionais = input.required<ProfissionalDisponivel[]>();
  readonly selecionado = output<ProfissionalDisponivel>();
}

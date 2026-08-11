import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TmButtonComponent } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublico } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';

@Component({
  selector: 'app-confirmacao',
  standalone: true,
  imports: [TmButtonComponent],
  templateUrl: './confirmacao.component.html',
  styleUrl: './confirmacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmacaoComponent {
  readonly agendamento = input.required<AgendamentoPublico>();
  readonly voltarInicio = output<void>();

  formatarData(data: Date): string {
    return new Date(data).toLocaleDateString('pt-BR');
  }

  formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}

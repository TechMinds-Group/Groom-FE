import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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

  /** CR-004 — desconto em reais com o cupom aplicado (0 sem cupom). */
  readonly valorDesconto = computed<number>(() => {
    const percentual = this.agendamento().cupomAniversarioPercentual ?? 0;
    return Math.max(0, Math.round(this.agendamento().servicoPreco * percentual) / 100);
  });

  readonly totalComDesconto = computed<number>(() =>
    Math.max(0, this.agendamento().servicoPreco - this.valorDesconto()),
  );

  formatarData(data: Date): string {
    return new Date(data).toLocaleDateString('pt-BR');
  }

  formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
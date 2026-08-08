import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';

@Component({
  selector: 'app-passo-servico',
  standalone: true,
  templateUrl: './passo-servico.component.html',
  styleUrl: './passo-servico.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassoServicoComponent {
  readonly servicos = input.required<ServicoDisponivel[]>();
  readonly selecionado = output<ServicoDisponivel>();

  formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}

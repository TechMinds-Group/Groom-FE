import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';

@Component({
  selector: 'app-passo-servico',
  standalone: true,
  templateUrl: './passo-servico.component.html',
  styleUrl: './passo-servico.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassoServicoComponent {
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
  readonly servicos = input.required<ServicoDisponivel[]>();
  readonly selecionado = output<ServicoDisponivel>();

  formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}

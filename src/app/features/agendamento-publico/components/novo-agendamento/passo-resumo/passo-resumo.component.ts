import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TmButtonComponent } from '@techminds-group/tm-angular-lib';
import { ProfissionalDisponivel, ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';

@Component({
  selector: 'app-passo-resumo',
  standalone: true,
  imports: [TmButtonComponent],
  templateUrl: './passo-resumo.component.html',
  styleUrl: './passo-resumo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassoResumoComponent {
  readonly profissional = input.required<ProfissionalDisponivel | null>();
  readonly servico = input.required<ServicoDisponivel | null>();
  readonly data = input<string | null>(null);
  readonly horario = input<string | null>(null);
  readonly isLoading = input(false);

  readonly confirmar = output<void>();

  formatarData(data: string): string {
    const [ano, mes, dia] = data.split('-').map(Number);
    return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
  }

  formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}

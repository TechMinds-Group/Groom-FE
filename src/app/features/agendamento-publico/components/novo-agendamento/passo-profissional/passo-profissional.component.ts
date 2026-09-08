import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ProfissionalDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';

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
  readonly expandirImagem = output<{ url: string; titulo: string }>();
  protected readonly estabelecimentoService = inject(EstabelecimentoService);

  inicial(nome: string): string {
    return nome.trim().charAt(0).toUpperCase();
  }

  onImagemClick(event: Event, url: string, nome: string): void {
    event.stopPropagation();
    this.expandirImagem.emit({ url, titulo: nome });
  }
}

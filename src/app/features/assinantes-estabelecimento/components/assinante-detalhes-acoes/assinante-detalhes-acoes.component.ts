import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-assinante-detalhes-acoes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assinante-detalhes-acoes.component.html',
  styleUrl: './assinante-detalhes-acoes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssinanteDetalhesAcoesComponent {
  editar = output<void>();
  excluir = output<void>();
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubeConfig } from '../../../../core/services/clubes.service';

@Component({
  selector: 'app-plano-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plano-card.component.html',
  styleUrl: './plano-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanoCardComponent {
  clube = input.required<ClubeConfig>();
  editar = output<ClubeConfig>();
  excluir = output<ClubeConfig>();
}
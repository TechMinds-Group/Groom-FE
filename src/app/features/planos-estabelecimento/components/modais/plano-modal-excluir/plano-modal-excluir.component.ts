import { ChangeDetectionStrategy, Component, model, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';

@Component({
  selector: 'app-plano-modal-excluir',
  standalone: true,
  imports: [CommonModule, TmModalComponent],
  templateUrl: './plano-modal-excluir.component.html',
  styleUrl: './plano-modal-excluir.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanoModalExcluirComponent {
  show = model<boolean>(false);
  nomePlano = input<string>('');
  totalAssinantes = input<number>(0);

  confirm = output<void>();
  cancel = output<void>();
}
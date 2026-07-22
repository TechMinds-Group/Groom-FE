import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';

@Component({
  selector: 'app-assinante-modal-excluir',
  standalone: true,
  imports: [CommonModule, TmModalComponent],
  templateUrl: './assinante-modal-excluir.component.html',
  styleUrl: './assinante-modal-excluir.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssinanteModalExcluirComponent {
  readonly show = model<boolean>(false);
  readonly nomeAssinante = input<string>('');

  readonly confirm = output<void>();
  readonly cancel = output<void>();

  protected onConfirm(): void {
    this.confirm.emit();
  }

  protected onCancel(): void {
    this.show.set(false);
    this.cancel.emit();
  }
}

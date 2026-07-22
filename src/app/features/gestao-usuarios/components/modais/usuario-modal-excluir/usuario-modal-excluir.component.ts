import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-usuario-modal-excluir',
  standalone: true,
  imports: [CommonModule, TmModalComponent, TranslatePipe],
  templateUrl: './usuario-modal-excluir.component.html',
  styleUrl: './usuario-modal-excluir.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioModalExcluirComponent {
  readonly show = model<boolean>(false);
  readonly nomeUsuario = input<string>('');

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

import { ChangeDetectionStrategy, Component, model, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';

@Component({
  selector: 'app-modal-form-base',
  standalone: true,
  imports: [CommonModule, TmModalComponent],
  template: `
    <tm-modal
      [title]="title()"
      [confirmLabel]="confirmLabel()"
      [cancelLabel]="cancelLabel()"
      [(show)]="show"
      (confirm)="confirm.emit()"
      (cancel)="cancel.emit()"
      [confirmClass]="confirmClass()"
      [icon]="icon()"
      [iconClass]="iconClass()"
      [size]="size()"
    >
      <div class="p-1 text-start">
        <ng-content></ng-content>
      </div>
    </tm-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalFormBaseComponent {
  show = model<boolean>(false);
  title = input<string>('');
  confirmLabel = input<string>('Confirmar');
  cancelLabel = input<string>('Cancelar');
  confirmClass = input<string>('btn-primary');
  icon = input<string>('fas fa-question-circle');
  iconClass = input<string>('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  confirm = output<void>();
  cancel = output<void>();
}
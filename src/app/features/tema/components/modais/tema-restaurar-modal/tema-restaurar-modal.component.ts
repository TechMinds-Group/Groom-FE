import { ChangeDetectionStrategy, Component, model, output } from '@angular/core';
import { ModalFormBaseComponent } from '../../../../../shared/modais/modal-form-base/modal-form-base.component';
import { TemaPreviewComponent } from '../../tema-preview/tema-preview.component';

/**
 * Modal de confirmação da ação "Restaurar padrão" (RN-103 — UI_SPEC §5.30).
 * Exibe a prévia do tema padrão antes de qualquer efeito; nada muda ao cancelar.
 */
@Component({
  selector: 'app-tema-restaurar-modal',
  standalone: true,
  imports: [ModalFormBaseComponent, TemaPreviewComponent],
  templateUrl: './tema-restaurar-modal.component.html',
  styleUrl: './tema-restaurar-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemaRestaurarModalComponent {
  /** Estado de exibição (padrão de modal — AGENTS.md §6). */
  readonly show = model<boolean>(false);

  confirm = output<void>();
  cancel = output<void>();
}

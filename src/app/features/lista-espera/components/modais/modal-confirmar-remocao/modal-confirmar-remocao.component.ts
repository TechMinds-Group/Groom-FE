import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';

/**
 * Modal de confirmação da remoção de cliente da lista de espera (RN-077 —
 * UI_SPEC §5.15). Exibe o cliente; o componente pai executa o DELETE.
 */
@Component({
  selector: 'app-modal-confirmar-remocao',
  standalone: true,
  imports: [TmModalComponent],
  templateUrl: './modal-confirmar-remocao.component.html',
  styleUrl: './modal-confirmar-remocao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalConfirmarRemocaoComponent {
  readonly show = model<boolean>(false);
  readonly clienteNome = input.required<string>();
  /** Estado do DELETE no pai — bloqueia reenvio enquanto a remoção é executada. */
  readonly removendo = input(false);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}

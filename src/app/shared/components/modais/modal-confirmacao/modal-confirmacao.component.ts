import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';

/**
 * Configuração da confirmação — o componente de tela monta o objeto com os textos
 * e a ação a executar quando o usuário confirma.
 */
export interface ConfirmacaoConfig {
  titulo: string;
  mensagem: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClass?: string;
  icon?: string;
  acao: () => Promise<void>;
}

/**
 * Modal genérico de confirmação (substitui o `confirm()` nativo do navegador —
 * padrão de UI do sistema). O componente de tela controla `show` e executa a
 * ação configurada no evento `confirmar`.
 */
@Component({
  selector: 'app-modal-confirmacao',
  standalone: true,
  imports: [TmModalComponent],
  templateUrl: './modal-confirmacao.component.html',
  styleUrl: './modal-confirmacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalConfirmacaoComponent {
  readonly show = model<boolean>(false);
  readonly titulo = input.required<string>();
  readonly mensagem = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly confirmClass = input('btn-primary');
  readonly icon = input('fa-solid fa-circle-question');
  /** Estado da execução da ação no pai — bloqueia reenvio enquanto roda. */
  readonly processando = input(false);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}

import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { ModalFormBaseComponent } from '../../../../../shared/modais/modal-form-base/modal-form-base.component';
import { JornadaEspecial } from '../../../../../core/models/configuracoes/jornada-especial.model';

/**
 * Modal de confirmação da exclusão de uma Jornada Especial (RN-147-3).
 * Padrão de confirmação do painel (AGENTS.md §6/§15 — model()/input()/output()).
 */
@Component({
  selector: 'app-jornada-excluir-modal',
  standalone: true,
  imports: [ModalFormBaseComponent],
  templateUrl: './jornada-excluir-modal.component.html',
  styleUrl: './jornada-excluir-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JornadaExcluirModalComponent {
  /** Estado de exibição (padrão de modal — AGENTS.md §6). */
  readonly show = model<boolean>(false);

  /** Jornada a excluir (para exibir o título na confirmação). */
  readonly jornada = input<JornadaEspecial | null>(null);

  /** Mensagem de erro devolvida pela API quando a exclusão falha; o modal permanece aberto. */
  readonly erro = input<string>('');

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}

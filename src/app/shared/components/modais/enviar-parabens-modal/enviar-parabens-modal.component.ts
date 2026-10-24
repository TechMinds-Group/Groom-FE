import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';
import { montarPreviewMensagem } from '../../../../core/models/aniversariantes/aniversariantes.model';

/**
 * Modal de envio manual de parabéns (RN-080/CR-004): sem campos de entrada —
 * exibe o preview da mensagem (com os padrões do menu já aplicados) e confirma.
 */
@Component({
  selector: 'app-enviar-parabens-modal',
  standalone: true,
  imports: [TmModalComponent],
  templateUrl: './enviar-parabens-modal.component.html',
  styleUrl: './enviar-parabens-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnviarParabensModalComponent {
  /** Estado de exibição (model — contrato de modais do projeto). */
  readonly show = model.required<boolean>();

  /** Aniversariante selecionado (id enviado na confirmação). */
  readonly clienteId = input.required<string>();

  readonly clienteNome = input.required<string>();

  /** Desconto padrão configurado (0 = mensagem sem cupom). */
  readonly percentualPadrao = input<number>(0);

  /** Validade padrão configurada (null com 0% — campo desabilitado no menu). */
  readonly validadePadrao = input<number | null>(null);

  /** Mensagem configurada no menu (null = padrão do sistema). */
  readonly mensagemConfig = input<string | null>(null);

  /** Instância WhatsApp conectada — sem conexão o envio é bloqueado com aviso. */
  readonly whatsappConectado = input<boolean>(true);

  /** True enquanto o pai executa o envio (bloqueia os botões). */
  readonly enviando = model<boolean>(false);

  /** Emite o id do aniversariante quando o usuário confirma o envio. */
  readonly confirmar = output<string>();

  protected readonly preview = computed<string>(() =>
    montarPreviewMensagem(this.mensagemConfig(), this.percentualPadrao(), this.validadePadrao()),
  );

  protected readonly podeEnviar = computed<boolean>(() => this.whatsappConectado() && this.enviando() === false);

  protected confirmarEnvio(): void {
    if (this.podeEnviar() === false) {
      return;
    }

    this.confirmar.emit(this.clienteId());
  }

  protected fechar(): void {
    this.show.set(false);
  }
}

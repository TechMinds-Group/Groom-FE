import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TmMercadoPagoPixComponent } from '../tm-mercado-pago-pix/tm-mercado-pago-pix.component';
import { LanguageService } from '../../../../core/services/language.service';
import { PlanoAssinatura } from '../../../../core/models/assinatura-sistema/plano-assinatura.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/**
 * Gerencia a contratação/renovação da assinatura (período fixo de 1 mês).
 * Exibe os detalhes do plano selecionado, resumo do pedido e checkout Pix com i18n.
 */
@Component({
  selector: 'app-renovacao-pagamento',
  standalone: true,
  imports: [TmMercadoPagoPixComponent, TranslatePipe],
  templateUrl: './renovacao-pagamento.component.html',
  styleUrl: './renovacao-pagamento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenovacaoPagamentoComponent {
  private readonly languageService = inject(LanguageService);

  readonly planosDisponiveis = input<PlanoAssinatura[]>([]);
  readonly planoSelecionado = input<PlanoAssinatura | null>(null);
  readonly valorTotal = input.required<number>();
  readonly nomePlanoAtual = input<string>('');
  readonly mostrarCheckoutMp = input.required<boolean>();
  readonly pagamentoSucesso = input.required<boolean>();

  readonly selecionarPlano = output<PlanoAssinatura>();
  readonly iniciarCheckout = output<void>();
  readonly confirmarPagamento = output<void>();
  readonly fecharCheckout = output<void>();
  readonly fecharSucesso = output<void>();

  /** Total a pagar formatado reativamente conforme o idioma ativo */
  protected readonly valorTotalFormatado = computed(() =>
    this.languageService.formatMoney(this.valorTotal()),
  );

  protected formatarMoeda(valor: number): string {
    return this.languageService.formatMoney(valor);
  }
}

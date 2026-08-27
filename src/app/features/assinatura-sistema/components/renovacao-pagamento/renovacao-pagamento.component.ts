import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TmSelectComponent, TmSelectOption, TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { LanguageService } from '../../../../core/services/language.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { PlanoAssinatura } from '../../../../core/models/assinatura-sistema/plano-assinatura.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { CartaoCreditoRequest, CheckoutAsaasResponse } from '../../../../core/services/assinatura-sistema.service';

/**
 * Gerencia a contratação/renovação da assinatura com Asaas Sandbox.
 * Exibe os detalhes do plano selecionado da tabela PlanosSistema, cálculo de taxas e checkout.
 */
@Component({
  selector: 'app-renovacao-pagamento',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, TmTextComponent],
  templateUrl: './renovacao-pagamento.component.html',
  styleUrl: './renovacao-pagamento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenovacaoPagamentoComponent {
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(TmToastService);
  protected readonly themeService = inject(ThemeService);

  readonly planosDisponiveis = input<PlanoAssinatura[]>([]);
  readonly planoSelecionado = input<PlanoAssinatura | null>(null);
  readonly valorTotal = input.required<number>();
  readonly nomePlanoAtual = input<string>('');
  readonly carregando = input<boolean>(false);
  readonly resultadoAsaas = input<CheckoutAsaasResponse | null>(null);
  readonly pagamentoSucesso = input.required<boolean>();

  readonly cnpj = input<string | undefined>('');
  readonly telefone = input<string | undefined>('');
  readonly email = input<string | undefined>('');

  readonly selecionarPlano = output<PlanoAssinatura>();
  readonly iniciarCheckoutAsaas = output<{
    formaPagamento: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    diaVencimento: number;
    email?: string;
    cnpj?: string;
    telefone?: string;
    cartao?: CartaoCreditoRequest;
  }>();
  readonly fecharSucesso = output<void>();

  protected readonly formaPagamento = signal<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  protected readonly diaVencimento = signal<number>(5);

  // Dados do Pagador (carregados da empresa ou preenchidos pelo usuário)
  protected readonly pagadorEmail = signal<string>('');
  protected readonly pagadorCnpj = signal<string>('');
  protected readonly pagadorTelefone = signal<string>('');

  // Dados de Cartão de Crédito (ESTRITAMENTE TEMPORÁRIOS NA MEMÓRIA)
  protected readonly holderName = signal<string>('');
  protected readonly cardNumber = signal<string>('');
  protected readonly holderEmail = signal<string>('');
  protected readonly expiryMonth = signal<string>('');
  protected readonly expiryYear = signal<string>('');
  protected readonly ccv = signal<string>('');
  protected readonly holderCpfCnpj = signal<string>('');
  protected readonly postalCode = signal<string>('');
  protected readonly addressNumber = signal<string>('');

  protected readonly diasVencimentoOpcoes: TmSelectOption[] = [
    { value: '5', label: 'Todo dia 05 do mês' },
    { value: '10', label: 'Todo dia 10 do mês' },
    { value: '15', label: 'Todo dia 15 do mês' },
    { value: '20', label: 'Todo dia 20 do mês' },
    { value: '25', label: 'Todo dia 25 do mês' },
  ];

  constructor() {
    effect(() => {
      if (this.email()) {
        this.pagadorEmail.set(this.email() || '');
        this.holderEmail.set(this.email() || '');
      }
      if (this.cnpj()) this.pagadorCnpj.set(this.cnpj() || '');
      if (this.telefone()) this.pagadorTelefone.set(this.telefone() || '');
    });
  }

  protected aoMudarDiaVencimento(valor: any): void {
    const num = Number(valor);
    if (!isNaN(num) && num > 0) {
      this.diaVencimento.set(num);
    }
  }

  /** Taxa de gateway calculada segundo o meio de pagamento */
  protected readonly taxaGateway = computed<number>(() => {
    const forma = this.formaPagamento();
    const valorPlano = this.valorTotal();
    if (forma === 'PIX') return 0.99;
    if (forma === 'BOLETO') return 1.99;
    if (forma === 'CREDIT_CARD') return Number((valorPlano * 0.0349 + 0.49).toFixed(2));
    return 0.99;
  });

  /** Valor total com repasse de taxa */
  protected readonly valorFinalComTaxa = computed<number>(() => {
    return this.valorTotal() + this.taxaGateway();
  });

  protected readonly valorPlanoFormatado = computed(() =>
    this.languageService.formatMoney(this.valorTotal()),
  );

  protected readonly taxaGatewayFormatada = computed(() =>
    this.languageService.formatMoney(this.taxaGateway()),
  );

  protected readonly valorFinalFormatado = computed(() =>
    this.languageService.formatMoney(this.valorFinalComTaxa()),
  );

  protected formatarMoeda(valor: number): string {
    return this.languageService.formatMoney(valor);
  }

  protected selecionarFormaPagamento(forma: 'PIX' | 'BOLETO' | 'CREDIT_CARD'): void {
    this.formaPagamento.set(forma);
    if (forma !== 'CREDIT_CARD') {
      this.limparDadosCartao();
    }
  }

  protected submeterCheckout(): void {
    const emailFinal = (this.pagadorEmail() || this.email() || '').trim();
    const cnpjFinal = (this.pagadorCnpj() || this.cnpj() || '').trim();
    const telefoneFinal = (this.pagadorTelefone() || this.telefone() || '').trim();

    if (!cnpjFinal) {
      this.toastService.warning('Informe o CPF/CNPJ do pagador para continuar.', 'Atenção');
      return;
    }
    if (!telefoneFinal) {
      this.toastService.warning('Informe o Telefone de contato do pagador para continuar.', 'Atenção');
      return;
    }

    let cartaoPayload: CartaoCreditoRequest | undefined = undefined;

    if (this.formaPagamento() === 'CREDIT_CARD') {
      if (!this.holderName() || !this.cardNumber() || !this.expiryMonth() || !this.expiryYear() || !this.ccv()) {
        this.toastService.warning('Preencha todos os dados obrigatórios do cartão de crédito.', 'Atenção');
        return;
      }

      cartaoPayload = {
        holderName: this.holderName(),
        number: this.cardNumber(),
        expiryMonth: this.expiryMonth(),
        expiryYear: this.expiryYear(),
        ccv: this.ccv(),
        cpfCnpj: this.holderCpfCnpj() || cnpjFinal,
        phone: telefoneFinal,
        email: this.holderEmail() || emailFinal,
        postalCode: this.postalCode(),
        addressNumber: this.addressNumber(),
      };
    }

    this.iniciarCheckoutAsaas.emit({
      formaPagamento: this.formaPagamento(),
      diaVencimento: this.diaVencimento(),
      email: emailFinal,
      cnpj: cnpjFinal,
      telefone: telefoneFinal,
      cartao: cartaoPayload,
    });

    // Limpeza imediata dos dados sensíveis do cartão da memória
    this.limparDadosCartao();
  }

  protected setPagadorCnpj(val: any): void {
    this.pagadorCnpj.set(val ? String(val) : '');
  }

  protected setPagadorTelefone(val: any): void {
    this.pagadorTelefone.set(val ? String(val) : '');
  }

  protected setPagadorEmail(val: any): void {
    this.pagadorEmail.set(val ? String(val) : '');
  }

  protected setHolderName(val: any): void {
    this.holderName.set(val ? String(val) : '');
  }

  protected setCardNumber(val: any): void {
    this.cardNumber.set(val ? String(val) : '');
  }

  protected setHolderEmail(val: any): void {
    this.holderEmail.set(val ? String(val) : '');
  }

  protected setExpiryMonth(val: any): void {
    this.expiryMonth.set(val ? String(val) : '');
  }

  protected setExpiryYear(val: any): void {
    this.expiryYear.set(val ? String(val) : '');
  }

  protected setCcv(val: any): void {
    this.ccv.set(val ? String(val) : '');
  }

  protected setHolderCpfCnpj(val: any): void {
    this.holderCpfCnpj.set(val ? String(val) : '');
  }

  protected setPostalCode(val: any): void {
    this.postalCode.set(val ? String(val) : '');
  }

  protected setAddressNumber(val: any): void {
    this.addressNumber.set(val ? String(val) : '');
  }

  /** Zera estritamente os dados sensíveis do cartão de crédito mantidos na memória */
  protected limparDadosCartao(): void {
    this.holderName.set('');
    this.cardNumber.set('');
    this.holderEmail.set('');
    this.expiryMonth.set('');
    this.expiryYear.set('');
    this.ccv.set('');
    this.holderCpfCnpj.set('');
    this.postalCode.set('');
    this.addressNumber.set('');
  }

  protected copiarCodigo(texto?: string, rotulo?: string): void {
    if (texto) {
      navigator.clipboard.writeText(texto);
      this.toastService.success(`${rotulo || 'Código'} copiado para a área de transferência!`, 'Sucesso');
    }
  }
}

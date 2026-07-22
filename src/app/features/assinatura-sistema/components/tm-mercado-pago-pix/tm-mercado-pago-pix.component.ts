import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent } from '@techminds-group/tm-angular-lib';
import { CpfHelper, cpfValidator } from '../../../../shared/validators/cpf.validator';
import { PagamentoPixResponse } from '../../../../core/models/assinatura-sistema/pagamento-pix-response.model';
import { AuthService } from '../../../../core/services/auth.service';
import { LanguageService } from '../../../../core/services/language.service';
import { CheckoutPixService } from '../../services/checkout-pix.service';
import { PixSessionCache } from '../../models/pix-session-cache.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/**
 * Componente modal do checkout Pix do Mercado Pago.
 * Exige que o usuário informe seus dados de pagador utilizando o componente tm-text da lib TM.
 * Aplica validação de tamanho mínimo, tamanho máximo, e-mail e CPF com Módulo 11.
 * Os dados do pagador são descartados da memória imediatamente após a chamada da API.
 */
@Component({
  selector: 'app-tm-mercado-pago-pix',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TranslatePipe],
  providers: [CheckoutPixService],
  templateUrl: './tm-mercado-pago-pix.component.html',
  styleUrl: './tm-mercado-pago-pix.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TmMercadoPagoPixComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly pixService = inject(CheckoutPixService);
  private readonly languageService = inject(LanguageService);
  private readonly authService = inject(AuthService);

  /** ID do usuário no momento em que o modal foi aberto, usado para detectar mudanças */
  private readonly userIdAoAbrir = this.authService.currentUserId();

  public readonly meses = input.required<number>();
  public readonly valorTotal = input.required<number>();
  public readonly nomePlano = input<string>('Groom Essential');

  public readonly pagamentoConfirmado = output<void>();
  public readonly fechar = output<void>();

  // Formulário do pagador em memória com restrições estritas de tamanho e formato
  protected readonly payerForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email, Validators.minLength(5), Validators.maxLength(100)]],
    cpf: ['', [Validators.required, cpfValidator()]],
  });

  protected readonly exibirFormulario = signal<boolean>(true);
  protected readonly pagando = signal<boolean>(false);
  protected readonly pagamentoId = signal<string | null>(null);
  protected readonly qrCode = signal<string | null>(null);
  protected readonly qrCodeBase64 = signal<string | null>(null);
  protected readonly copiado = signal<boolean>(false);
  protected readonly erroMsg = signal<string | null>(null);

  protected readonly pixExpirado = this.pixService.pixExpirado;
  protected readonly tempoRestanteFormatado = this.pixService.tempoRestanteFormatado;

  protected readonly valorTotalFormatado = computed(() =>
    this.languageService.formatMoney(this.valorTotal()),
  );

  public ngOnInit(): void {
    // Registra o callback de invalidação por segurança (logout, outra aba, etc.)
    this.pixService.registrarCallbackInvalidacao(() => this.invalidarQrCodePorSeguranca());
    this.carregarOuGerarPix();
  }

  /**
   * Effect reativo: invalida o QR Code imediatamente se o usuário autenticado mudar
   * enquanto o modal estiver aberto (ex: outra aba faz login com outra conta).
   */
  private readonly _guardaUsuario = effect(() => {
    const userIdAtual = this.authService.currentUserId();
    if (this.userIdAoAbrir !== undefined && userIdAtual !== this.userIdAoAbrir) {
      this.invalidarQrCodePorSeguranca();
    }
  });

  private carregarOuGerarPix(): void {
    const cache: PixSessionCache | null = this.pixService.obterSessaoAtiva(
      this.nomePlano(),
      this.valorTotal(),
    );

    if (cache) {
      const segundosRestantes = Math.floor((cache.expiresAt - Date.now()) / 1000);
      this.pagamentoId.set(cache.id.toString());
      this.qrCode.set(cache.qrCode);
      this.qrCodeBase64.set(cache.qrCodeBase64);
      this.exibirFormulario.set(false);

      this.pixService.iniciarTimerExpiracao(segundosRestantes, () => this.limparQrCode());
      this.pixService.iniciarPollingStatus(cache.id, () => this.pagamentoConfirmado.emit());
    }
  }

  /**
   * Valida o campo de CPF no evento focusout (blur).
   */
  protected validarCpfNoBlur(): void {
    const cpfControl = this.payerForm.get('cpf');
    if (!cpfControl) {
      return;
    }

    cpfControl.markAsTouched();

    const value = (cpfControl.value || '').trim();
    if (value.length === 0) {
      if (this.erroMsg() === this.languageService.translate('ASSINATURA.PIX_MODAL.CPF_INVALID')) {
        this.erroMsg.set(null);
      }
      return;
    }

    const cleanCpf = value.replace(/\D/g, '');
    if (!CpfHelper.validarCpf(cleanCpf)) {
      cpfControl.setErrors({ cpfInvalido: true });
      this.erroMsg.set(
        this.languageService.translate('ASSINATURA.PIX_MODAL.CPF_INVALID'),
      );
    } else {
      cpfControl.setErrors(null);
      if (this.erroMsg() === this.languageService.translate('ASSINATURA.PIX_MODAL.CPF_INVALID')) {
        this.erroMsg.set(null);
      }
    }
  }

  /**
   * Valida o campo de e-mail no evento focusout (blur).
   */
  protected validarEmailNoBlur(): void {
    const emailControl = this.payerForm.get('email');
    if (!emailControl) {
      return;
    }

    emailControl.markAsTouched();

    const value = (emailControl.value || '').trim();
    if (value.length === 0) {
      if (this.erroMsg() === this.languageService.translate('ASSINATURA.PIX_MODAL.EMAIL_INVALID')) {
        this.erroMsg.set(null);
      }
      return;
    }

    if (emailControl.invalid) {
      this.erroMsg.set(
        this.languageService.translate('ASSINATURA.PIX_MODAL.EMAIL_INVALID'),
      );
    } else {
      if (this.erroMsg() === this.languageService.translate('ASSINATURA.PIX_MODAL.EMAIL_INVALID')) {
        this.erroMsg.set(null);
      }
    }
  }

  /**
   * Valida e submete o formulário de dados do pagador.
   * Assim que a requisição é disparada, o formulário é completamente zerado em memória.
   */
  protected submeterFormulario(): void {
    if (this.payerForm.get('email')?.invalid) {
      this.erroMsg.set(
        this.languageService.translate('ASSINATURA.PIX_MODAL.EMAIL_INVALID'),
      );
      return;
    }

    if (this.payerForm.get('cpf')?.hasError('cpfInvalido')) {
      this.erroMsg.set(
        this.languageService.translate('ASSINATURA.PIX_MODAL.CPF_INVALID'),
      );
      return;
    }

    if (this.payerForm.invalid) {
      this.payerForm.markAllAsTouched();
      this.erroMsg.set(
        this.languageService.translate('ASSINATURA.PIX_MODAL.VALIDATION_ERROR'),
      );
      return;
    }

    const val = this.payerForm.value;
    const fn = (val.firstName || '').trim();
    const ln = (val.lastName || '').trim();
    const em = (val.email || '').trim();
    const c = (val.cpf || '').replace(/\D/g, '');

    if (fn.length < 2 || fn.length > 50 || ln.length < 2 || ln.length > 50 || em.length < 5 || em.length > 100 || !CpfHelper.validarCpf(c)) {
      this.erroMsg.set(
        this.languageService.translate('ASSINATURA.PIX_MODAL.VALIDATION_ERROR'),
      );
      return;
    }

    this.erroMsg.set(null);
    this.pagando.set(true);

    const payerData = {
      firstName: fn,
      lastName: ln,
      email: em,
      cpf: c,
    };

    // Reseta o formulário em memória imediatamente para não manter os dados sensíveis
    this.payerForm.reset();

    this.pixService.criarPagamentoPix(this.meses(), this.nomePlano(), payerData).subscribe({
      next: (res: PagamentoPixResponse) => {
        this.pagamentoId.set(res.id.toString());
        this.qrCode.set(res.qrCode);
        this.qrCodeBase64.set(res.qrCodeBase64);
        this.pagando.set(false);
        this.exibirFormulario.set(false);

        this.pixService.iniciarTimerExpiracao(900, () => this.limparQrCode());
        this.pixService.iniciarPollingStatus(res.id, () => this.pagamentoConfirmado.emit());
      },
      error: () => {
        this.pagando.set(false);
        this.erroMsg.set(this.languageService.translate('ASSINATURA.PIX_MODAL.ERROR_CREATE'));
      },
    });
  }

  protected forcarGerarNovoPix(): void {
    this.pixService.limparSessao();
    this.limparQrCode();
    this.exibirFormulario.set(true);
  }

  /**
   * Permite ao usuário cancelar o Pix atual para corrigir seus dados e gerar um novo QR Code.
   */
  protected regerarComNovosDados(): void {
    this.pixService.limparRecursos();
    this.pixService.limparSessao();
    this.limparQrCode();
    this.payerForm.reset();
    this.erroMsg.set(null);
    this.exibirFormulario.set(true);
  }

  /**
   * Invocado pelo CheckoutPixService (via callback registrado) ou pelo effect de guarda de usuário.
   * Reseta o estado do modal para o formulário inicial, invalidando o QR Code por motivo de segurança.
   */
  private invalidarQrCodePorSeguranca(): void {
    this.pixService.limparRecursos();
    this.pixService.limparSessao();
    this.limparQrCode();
    this.payerForm.reset();
    this.erroMsg.set(null);
    this.exibirFormulario.set(true);
    this.pixService.pixExpirado.set(false);
  }

  private limparQrCode(): void {
    this.qrCode.set(null);
    this.qrCodeBase64.set(null);
  }

  protected copiarPix(text: string): void {
    if (!text) {
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      this.copiado.set(true);
      setTimeout(() => {
        this.copiado.set(false);
      }, 2000);
    });
  }

  public ngOnDestroy(): void {
    this.payerForm.reset();
    this.pixService.limparRecursos();
  }
}

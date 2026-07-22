import { inject, Injectable, signal, computed, OnDestroy } from '@angular/core';
import { Observable, Subscription, tap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { MercadoPagoSdkService } from '../../../core/services/mercadopago-sdk.service';
import { AssinaturaSistemaService } from '../../../core/services/assinatura-sistema.service';
import { PagamentoPixResponse } from '../../../core/models/assinatura-sistema/pagamento-pix-response.model';
import { StatusPagamentoResponse } from '../../../core/models/assinatura-sistema/status-pagamento-response.model';
import { PixSessionCache } from '../models/pix-session-cache.model';

const PIX_SESSION_KEY = 'groom_active_pix_session';
const EXPIRATION_TIME_MS = 15 * 60 * 1000; // 15 minutos em ms

/**
 * Serviço de escopo local responsável por encapsular as regras de negócio do pagamento via Pix:
 * cache de sessão (15 min), cronômetro de expiração, polling de status e invalidação segura.
 *
 * Segurança: O QR Code é automaticamente invalidado nos seguintes eventos:
 * - Logout do usuário autenticado
 * - Mudança de usuário (troca de conta na mesma aba)
 * - Modificação do sessionStorage por outra aba (cross-tab tampering)
 * - Expiração do timer de 15 minutos
 */
@Injectable()
export class CheckoutPixService implements OnDestroy {
  private readonly assinaturaService = inject(AssinaturaSistemaService);
  private readonly authService = inject(AuthService);
  private readonly mpSdk = inject(MercadoPagoSdkService);

  /** Tempo restante da validade do Pix em segundos */
  public readonly tempoRestanteSegundos = signal<number>(900);

  /** Indica se o tempo limite de 15 minutos foi atingido */
  public readonly pixExpirado = signal<boolean>(false);

  /** Formatação min:seg do tempo restante (ex: '14:59') */
  public readonly tempoRestanteFormatado = computed(() => {
    const totalSegundos = this.tempoRestanteSegundos();
    if (totalSegundos <= 0) {
      return '00:00';
    }
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    const mm = minutos.toString().padStart(2, '0');
    const ss = segundos.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  });

  private timerInterval?: ReturnType<typeof setInterval>;
  private pollingInterval?: ReturnType<typeof setInterval>;
  private readonly subscriptions = new Subscription();

  /** Callback registrado pelo componente para reagir à invalidação do QR */
  private onInvalidar?: () => void;

  constructor() {
    this.registrarGuardas();
    this.mpSdk.initialize().catch(() => {});
  }

  /**
   * Registra os observadores de segurança que invalidam o QR Code
   * quando o contexto de autenticação muda.
   */
  private registrarGuardas(): void {
    // Guarda 1: Logout explícito do usuário
    const logoutSub = this.authService.logout$.subscribe(() => {
      this.invalidarPorSeguranca('logout');
    });
    this.subscriptions.add(logoutSub);

    // Guarda 2: Modificação do sessionStorage por outra aba (ex: outra aba faz logout)
    const storageHandler = (event: StorageEvent) => {
      if (event.key === PIX_SESSION_KEY && event.newValue === null) {
        // Outra aba limpou a sessão Pix
        this.invalidarPorSeguranca('storage-cleared-by-other-tab');
      }
      if (event.key === 'tenant_id' || event.key === null) {
        // Mudança de tenant ou limpeza total do storage
        this.invalidarPorSeguranca('tenant-changed');
      }
    };
    window.addEventListener('storage', storageHandler);
    this.subscriptions.add(new Subscription(() => window.removeEventListener('storage', storageHandler)));
  }

  /**
   * Registra o callback a ser executado quando o QR Code for invalidado por segurança.
   * Deve ser chamado pelo componente logo após a criação.
   */
  public registrarCallbackInvalidacao(callback: () => void): void {
    this.onInvalidar = callback;
  }

  /**
   * Invalida o QR Code atual e notifica o componente para exibir o formulário novamente.
   */
  private invalidarPorSeguranca(motivo: string): void {
    const temSessao = !!sessionStorage.getItem(PIX_SESSION_KEY);
    if (!temSessao) return; // Nada a invalidar

    console.warn(`[PixSecurity] QR Code invalidado por: ${motivo}`);
    this.limparRecursos();
    this.limparSessao();
    this.pixExpirado.set(false);

    if (this.onInvalidar) {
      this.onInvalidar();
    }
  }

  /**
   * Obtém os dados da sessão Pix ativa, verificando:
   * - Validade do prazo de 15 minutos
   * - Correspondência de plano e valor
   * - Correspondência do userId autenticado (impede reuso por outro usuário)
   */
  public obterSessaoAtiva(nomePlano: string, valorTotal: number): PixSessionCache | null {
    const sessionRaw = sessionStorage.getItem(PIX_SESSION_KEY);
    if (!sessionRaw) {
      return null;
    }

    try {
      const cache: PixSessionCache = JSON.parse(sessionRaw);
      const agora = Date.now();
      const currentUserId = this.authService.currentUserId();

      const valido =
        cache.expiresAt > agora &&
        cache.nomePlano === nomePlano &&
        cache.valorTotal === valorTotal &&
        !!currentUserId &&
        cache.userId === currentUserId;

      if (valido) {
        return cache;
      }

      // Cache inválido (expirado, plano diferente ou usuário diferente) — limpa
      this.limparSessao();
    } catch {
      this.limparSessao();
    }

    return null;
  }

  /**
   * Solicita a geração do Pix ao gateway enviando os dados informados do pagador.
   * O userId do usuário autenticado é vinculado ao cache para garantir a propriedade do QR Code.
   * Os dados do pagador não são armazenados no cache da sessão nem mantidos pelo serviço.
   */
  public criarPagamentoPix(
    meses: number,
    nomePlano: string,
    payer: { firstName: string; lastName: string; email: string; cpf: string },
  ): Observable<PagamentoPixResponse> {
    this.pixExpirado.set(false);

    const deviceId = this.mpSdk.getDeviceSessionId();

    return this.assinaturaService
      .gerarPixAssinatura(
        meses,
        nomePlano,
        payer.email,
        payer.firstName,
        payer.lastName,
        payer.cpf,
        deviceId,
      )
      .pipe(
        tap((res: PagamentoPixResponse) => {
          const agora = Date.now();
          const currentUserId = this.authService.currentUserId();

          if (!currentUserId) {
            // Usuário não autenticado — não persiste o cache por segurança
            return;
          }

          const cache: PixSessionCache = {
            id: res.id,
            qrCode: res.qrCode,
            qrCodeBase64: res.qrCodeBase64,
            nomePlano,
            valorTotal: res.valorTotal,
            createdAt: agora,
            expiresAt: agora + EXPIRATION_TIME_MS,
            userId: currentUserId,
          };
          sessionStorage.setItem(PIX_SESSION_KEY, JSON.stringify(cache));
        }),
      );
  }

  /**
   * Inicia o timer regressivo de 15 minutos.
   */
  public iniciarTimerExpiracao(segundosIniciais: number, aoExpirar?: () => void): void {
    this.pararTimerExpiracao();
    this.tempoRestanteSegundos.set(segundosIniciais);

    this.timerInterval = setInterval(() => {
      const atual = this.tempoRestanteSegundos() - 1;
      if (atual <= 0) {
        this.tempoRestanteSegundos.set(0);
        this.expirarPix();
        if (aoExpirar) {
          aoExpirar();
        }
      } else {
        this.tempoRestanteSegundos.set(atual);
      }
    }, 1000);
  }

  /**
   * Inicia o polling a cada 4s para verificar se o pagamento foi aprovado.
   */
  public iniciarPollingStatus(id: number, aoAprovar: () => void): void {
    this.pararPolling();

    this.pollingInterval = setInterval(() => {
      this.assinaturaService.obterStatusPagamento(id).subscribe({
        next: (res: StatusPagamentoResponse) => {
          if (res.status === 'approved') {
            this.limparRecursos();
            this.limparSessao();
            aoAprovar();
          }
        },
        error: () => {
          // Falhas temporárias de rede são ignoradas
        },
      });
    }, 4000);
  }

  public expirarPix(): void {
    this.limparRecursos();
    this.limparSessao();
    this.pixExpirado.set(true);
  }

  public limparSessao(): void {
    sessionStorage.removeItem(PIX_SESSION_KEY);
  }

  public pararTimerExpiracao(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  public pararPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  public limparRecursos(): void {
    this.pararTimerExpiracao();
    this.pararPolling();
  }

  public ngOnDestroy(): void {
    this.limparRecursos();
    this.subscriptions.unsubscribe();
  }
}

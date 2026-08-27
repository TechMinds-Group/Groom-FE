import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { PlanoAssinatura } from '../../../../core/models/assinatura-sistema/plano-assinatura.model';
import { LanguageService } from '../../../../core/services/language.service';
import { AssinaturaSistemaService, CheckoutAsaasResponse } from '../../../../core/services/assinatura-sistema.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { PlanoGroomEstado } from '../../models/plano-groom-estado.model';
import { StatusAssinatura } from '../../enums/status-assinatura.enum';
import { PlanoAtualComponent } from '../plano-atual/plano-atual.component';
import { UsoLicencaComponent } from '../uso-licenca/uso-licenca.component';
import { RenovacaoPagamentoComponent } from '../renovacao-pagamento/renovacao-pagamento.component';

@Component({
  selector: 'app-assinatura-sistema',
  standalone: true,
  imports: [
    PlanoAtualComponent,
    UsoLicencaComponent,
    RenovacaoPagamentoComponent,
    TranslatePipe,
  ],
  templateUrl: './assinatura-sistema.component.html',
  styleUrl: './assinatura-sistema.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssinaturaSistemaComponent implements OnInit, OnDestroy {
  private readonly assinaturaService = inject(AssinaturaSistemaService);
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(TmToastService);
  private pollIntervalSub?: Subscription;

  protected readonly planoGroom = signal<PlanoGroomEstado>({
    nome: this.languageService.translate('ASSINATURA.LOADING'),
    valor: 0,
    ciclo: '',
    status: StatusAssinatura.Inativo,
    validoAte: null,
    diasRestantes: 0,
    usoProfissionais: 0,
    limiteProfissionais: 0,
    usoClientes: 0,
    limiteClientes: 0,
  });

  protected readonly planosDisponiveis = signal<PlanoAssinatura[]>([]);
  protected readonly planoSelecionado = signal<PlanoAssinatura | null>(null);
  protected readonly pagamentoSucesso = signal<boolean>(false);
  protected readonly carregandoAsaas = signal<boolean>(false);
  protected readonly resultadoAsaas = signal<CheckoutAsaasResponse | null>(null);

  protected readonly valorTotal = computed<number>(() => {
    const plano = this.planoSelecionado();
    return plano ? plano.valor : 0;
  });

  protected readonly pctProfissionais = computed<number>(() => {
    const e = this.planoGroom();
    return e.limiteProfissionais > 0 ? (e.usoProfissionais / e.limiteProfissionais) * 100 : 0;
  });

  protected readonly pctClientes = computed<number>(() => {
    const e = this.planoGroom();
    return e.limiteClientes > 0 ? (e.usoClientes / e.limiteClientes) * 100 : 0;
  });

  /** Define se o bloco de renovação/contratação de plano deve ser exibido (apenas <= 5 dias ou se inativo) */
  protected readonly podeRenovar = computed<boolean>(() => {
    const e = this.planoGroom();
    if (e.status !== StatusAssinatura.Ativo) {
      return true;
    }
    return e.diasRestantes <= 5;
  });

  /** Alerta dinâmico de status da licença, dias faltantes e prazos */
  protected readonly infoAlerta = computed<{
    tipo: 'success' | 'warning' | 'danger';
    titulo: string;
    mensagem: string;
    icone: string;
  }>(() => {
    const e = this.planoGroom();
    const status = e.status;
    const dias = e.diasRestantes;
    const validoAte = e.validoAte;

    if (status !== StatusAssinatura.Ativo || dias <= 0) {
      return {
        tipo: 'danger',
        titulo: 'Assinatura Vencida ou Inativa',
        mensagem: validoAte
          ? `Sua assinatura venceu em ${validoAte}. Realize o pagamento de renovação abaixo para reativar seu acesso imediatamente.`
          : 'Sua assinatura encontra-se inativa. Escolha um plano abaixo para efetuar a contratação.',
        icone: 'fas fa-times-circle text-danger',
      };
    }

    if (dias === 0) {
      return {
        tipo: 'warning',
        titulo: 'Sua assinatura vence hoje!',
        mensagem: `Sua licença expira hoje (${validoAte}). Escolha a melhor forma de pagamento abaixo para manter seus serviços ativos.`,
        icone: 'fas fa-clock text-warning',
      };
    }

    if (dias <= 7) {
      return {
        tipo: 'warning',
        titulo: `Atenção: Sua assinatura vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}!`,
        mensagem: `Sua licença vence em ${validoAte}. Você já pode realizar a renovação antecipada abaixo para evitar qualquer bloqueio.`,
        icone: 'fas fa-exclamation-triangle text-warning',
      };
    }

    return {
      tipo: 'success',
      titulo: 'Assinatura Ativa e em Dia',
      mensagem: `Sua licença está válida até ${validoAte || 'Período Ativo'} (faltam ${dias} dias). Nenhuma ação urgente necessária no momento.`,
      icone: 'fas fa-check-circle text-success',
    };
  });

  public ngOnInit(): void {
    this.carregarPlanoAtual();
    this.carregarPlanosDisponiveis();
  }

  public ngOnDestroy(): void {
    this.pararPollingStatus();
  }

  private carregarPlanoAtual(): void {
    this.assinaturaService.getPlanoAtual().subscribe({
      next: (plano: PlanoAssinatura) => {
        let dataValidadeStr: string | null = null;
        if (plano.validoAte) {
          const lang = this.languageService.currentLang();
          dataValidadeStr = new Date(plano.validoAte).toLocaleDateString(lang);
        }
        this.planoGroom.set({
          nome: plano.nome,
          valor: plano.valor,
          ciclo: plano.ciclo,
          status: (plano.status as StatusAssinatura) ?? StatusAssinatura.Inativo,
          validoAte: dataValidadeStr,
          diasRestantes: plano.diasRestantes ?? 0,
          limiteProfissionais: plano.limiteProfissionais ?? 0,
          limiteClientes: plano.limiteClientes ?? 0,
          usoProfissionais: plano.usoProfissionais ?? 0,
          usoClientes: plano.usoClientes ?? 0,
          cnpj: plano.cnpj,
          telefone: plano.telefone,
          email: plano.email,
        });

        if (!this.planoSelecionado()) {
          this.planoSelecionado.set(plano);
        }
      },
    });
  }

  private carregarPlanosDisponiveis(): void {
    this.assinaturaService.getPlanosDisponiveis().subscribe({
      next: (planos: PlanoAssinatura[]) => {
        if (Array.isArray(planos) && planos.length > 0) {
          this.planosDisponiveis.set(planos);
          const planoAtual = planos.find((p) => p.nome === this.planoGroom().nome) || planos[0];
          this.planoSelecionado.set(planoAtual);
        }
      },
      error: () => {
        if (this.planosDisponiveis().length === 0) {
          const e = this.planoGroom();
          const fallback: PlanoAssinatura = {
            id: '1',
            nome: e.nome,
            valor: e.valor,
            ciclo: e.ciclo,
            status: e.status,
            limiteProfissionais: e.limiteProfissionais,
            limiteClientes: e.limiteClientes,
            usoProfissionais: e.usoProfissionais,
            usoClientes: e.usoClientes,
            cnpj: e.cnpj,
            telefone: e.telefone,
            email: e.email,
          };
          this.planosDisponiveis.set([fallback]);
          this.planoSelecionado.set(fallback);
        }
      },
    });
  }

  protected aoSelecionarPlano(plano: PlanoAssinatura): void {
    this.planoSelecionado.set(plano);
  }

  protected aoIniciarCheckoutAsaas(dados: {
    formaPagamento: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    diaVencimento: number;
    email?: string;
    cnpj?: string;
    telefone?: string;
    cartao?: any;
  }): void {
    const plano = this.planoSelecionado();
    if (!plano || !plano.id) {
      this.toastService.error('Selecione um plano válido.', 'Atenção');
      return;
    }

    this.carregandoAsaas.set(true);
    this.assinaturaService.checkoutAsaas({
      planoId: plano.id,
      formaPagamento: dados.formaPagamento,
      diaVencimento: dados.diaVencimento,
      email: dados.email,
      cnpj: dados.cnpj,
      telefone: dados.telefone,
      cartao: dados.cartao,
    }).subscribe({
      next: (res) => {
        this.carregandoAsaas.set(false);
        if (res.status === 'CONFIRMED' || res.status === 'RECEIVED') {
          this.pararPollingStatus();
          this.resultadoAsaas.set(null);
          this.pagamentoSucesso.set(true);
          this.toastService.success('Pagamento aprovado e licença renovada com sucesso!', 'Sucesso');
          this.carregarPlanoAtual();
        } else {
          this.resultadoAsaas.set(res);
          this.toastService.success('Cobrança gerada com sucesso no Asaas!', 'Sucesso');
          this.iniciarPollingStatus();
        }
      },
      error: (err) => {
        this.carregandoAsaas.set(false);
        const msg = err?.error?.message || 'Erro ao gerar cobrança no Asaas.';
        this.toastService.error(msg, 'Erro');
      },
    });
  }

  private iniciarPollingStatus(): void {
    this.pararPollingStatus();
    this.pollIntervalSub = timer(3000, 4000).pipe(
      switchMap(() => this.assinaturaService.sincronizarPagamento())
    ).subscribe({
      next: (res) => {
        if (res && res.sincronizado) {
          this.pararPollingStatus();
          this.resultadoAsaas.set(null);
          this.pagamentoSucesso.set(true);
          this.toastService.success('Pagamento aprovado via PIX/Boleto e licença renovada com sucesso!', 'Sucesso');
          this.carregarPlanoAtual();
        }
      },
    });
  }

  private pararPollingStatus(): void {
    if (this.pollIntervalSub) {
      this.pollIntervalSub.unsubscribe();
      this.pollIntervalSub = undefined;
    }
  }

  protected aoFecharSucesso(): void {
    this.pararPollingStatus();
    this.pagamentoSucesso.set(false);
    this.resultadoAsaas.set(null);
    this.carregarPlanoAtual();
  }
}

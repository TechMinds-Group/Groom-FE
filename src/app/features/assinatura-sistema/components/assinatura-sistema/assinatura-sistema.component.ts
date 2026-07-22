import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { AssinaturaSistemaService } from '../../../../core/services/assinatura-sistema.service';
import { PlanoAssinatura } from '../../../../core/models/assinatura-sistema/plano-assinatura.model';
import { LanguageService } from '../../../../core/services/language.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { PlanoGroomEstado } from '../../models/plano-groom-estado.model';
import { StatusAssinatura } from '../../enums/status-assinatura.enum';
import { PlanoAtualComponent } from '../plano-atual/plano-atual.component';
import { UsoLicencaComponent } from '../uso-licenca/uso-licenca.component';
import { RenovacaoPagamentoComponent } from '../renovacao-pagamento/renovacao-pagamento.component';

/**
 * Orquestrador da tela de assinatura do sistema Groom.
 * Centraliza o estado da assinatura atual e a contratação fixa de 1 mês.
 * Suporta internacionalização completa via TranslatePipe e LanguageService.
 */
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
export class AssinaturaSistemaComponent implements OnInit {
  private readonly assinaturaService = inject(AssinaturaSistemaService);
  private readonly languageService = inject(LanguageService);

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
    usoClientesAssinantes: 0,
    limiteClientesAssinantes: 0,
  });

  protected readonly planosDisponiveis = signal<PlanoAssinatura[]>([]);
  protected readonly planoSelecionado = signal<PlanoAssinatura | null>(null);
  protected readonly mostrarCheckoutMp = signal<boolean>(false);
  protected readonly pagamentoSucesso = signal<boolean>(false);

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

  protected readonly pctClientesAssinantes = computed<number>(() => {
    const e = this.planoGroom();
    return e.limiteClientesAssinantes > 0
      ? (e.usoClientesAssinantes / e.limiteClientesAssinantes) * 100
      : 0;
  });

  public ngOnInit(): void {
    this.carregarPlanoAtual();
    this.carregarPlanosDisponiveis();
  }

  /**
   * Consulta os dados da assinatura ativa do estabelecimento.
   */
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
          limiteClientesAssinantes: plano.limiteClientesAssinantes ?? 0,
          usoProfissionais: plano.usoProfissionais ?? 0,
          usoClientes: plano.usoClientes ?? 0,
          usoClientesAssinantes: plano.usoClientesAssinantes ?? 0,
        });

        // Se a lista de planos ainda não tiver sido carregada, define plano selecionado inicial
        if (!this.planoSelecionado()) {
          this.planoSelecionado.set(plano);
        }
      },
    });
  }

  /**
   * Busca a lista completa de todos os planos disponíveis cadastrados no banco de dados.
   */
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
        const loadingText = this.languageService.translate('ASSINATURA.LOADING');
        if (this.planosDisponiveis().length === 0 && this.planoGroom().nome !== loadingText) {
          const e = this.planoGroom();
          const fallbackPlano: PlanoAssinatura = {
            id: '1',
            nome: e.nome,
            valor: e.valor,
            ciclo: e.ciclo,
            status: e.status,
            limiteProfissionais: e.limiteProfissionais,
            limiteClientes: e.limiteClientes,
            limiteClientesAssinantes: e.limiteClientesAssinantes,
            usoProfissionais: e.usoProfissionais,
            usoClientes: e.usoClientes,
            usoClientesAssinantes: e.usoClientesAssinantes,
          };
          this.planosDisponiveis.set([fallbackPlano]);
          this.planoSelecionado.set(fallbackPlano);
        }
      },
    });
  }

  protected aoSelecionarPlano(plano: PlanoAssinatura): void {
    this.planoSelecionado.set(plano);
  }

  /**
   * Trata o retorno positivo de pagamento efetuado.
   */
  protected aoConfirmarPagamento(): void {
    this.pagamentoSucesso.set(true);
    this.mostrarCheckoutMp.set(false);
    this.carregarPlanoAtual();
  }

  protected aoIniciarCheckout(): void {
    this.mostrarCheckoutMp.set(true);
  }

  protected aoFecharCheckout(): void {
    this.mostrarCheckoutMp.set(false);
  }

  protected aoFecharSucesso(): void {
    this.pagamentoSucesso.set(false);
  }
}

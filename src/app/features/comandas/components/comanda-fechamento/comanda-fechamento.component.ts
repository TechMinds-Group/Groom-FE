import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { ComandaService } from '../../../../core/services/comanda.service';
import { Comanda, ComandaItem, TipoDesconto } from '../../../../core/models/comanda/comanda.model';
import {
  ConfirmacaoConfig,
  ModalConfirmacaoComponent,
} from '../../../../shared/components/modais/modal-confirmacao/modal-confirmacao.component';

@Component({
  selector: 'app-comanda-fechamento',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule, ModalConfirmacaoComponent],
  templateUrl: './comanda-fechamento.component.html',
  styleUrls: ['./comanda-fechamento.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComandaFechamentoComponent implements OnInit {
  private readonly comandaService = inject(ComandaService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly comanda = signal<Comanda | null>(null);
  readonly carregando = signal(true);
  protected readonly salvando = signal(false);

  protected readonly descontoTipo = signal<TipoDesconto>('percentual');
  readonly descontoValor = signal<number | null>(null);
  protected readonly observacoes = signal('');

  /** `itens` vem `null` do backend quando vazio — tratado como lista vazia. */
  protected readonly itens = computed<ComandaItem[]>(() => this.comanda()?.itens ?? []);

  /** Subtotal = ValorTotal da comanda (calculado no servidor). */
  readonly subtotal = computed(() => this.comanda()?.valorTotal ?? 0);

  readonly descontoCalculado = computed(() => {
    const valor = this.descontoValor();
    if (valor === null || isNaN(valor) || valor <= 0) {
      return 0;
    }
    if (this.descontoTipo() === 'percentual') {
      return this.subtotal() * (valor / 100);
    }
    return valor;
  });

  /** Validação cliente (espelha ERR-104): desconto não pode exceder o valor total. */
  readonly descontoInvalido = computed(() => {
    const valor = this.descontoValor();
    if (valor === null || isNaN(valor) || valor <= 0) {
      return false;
    }
    if (this.descontoTipo() === 'percentual') {
      return valor > 100;
    }
    return valor > this.subtotal();
  });

  readonly valorFinal = computed(() => {
    const final = this.subtotal() - this.descontoCalculado();
    return final < 0 ? 0 : final;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.carregar(id);
    } else {
      this.router.navigate(['/gestao/comandas']);
    }
  }

  private async carregar(id: string): Promise<void> {
    this.carregando.set(true);
    try {
      const c = await firstValueFrom(this.comandaService.getComanda(id));
      if (c.status !== 'Aberta') {
        this.toastService.error('Apenas comandas abertas podem ser fechadas.');
        this.router.navigate(['/gestao/comandas', id]);
        return;
      }
      this.comanda.set(c);
    } catch {
      this.toastService.error('Comanda não encontrada.');
      this.router.navigate(['/gestao/comandas']);
    } finally {
      this.carregando.set(false);
    }
  }

  selecionarTipo(tipo: TipoDesconto): void {
    this.descontoTipo.set(tipo);
  }

  protected setDescontoValor(valor: number | string | null): void {
    if (valor === null || valor === '') {
      this.descontoValor.set(null);
      return;
    }
    const n = Number(valor);
    this.descontoValor.set(isNaN(n) ? null : n);
  }

  protected voltar(): void {
    const c = this.comanda();
    this.router.navigate(['/gestao/comandas', c ? c.id : '']);
  }

  protected readonly confirmacao = signal<ConfirmacaoConfig | null>(null);
  protected readonly executandoConfirmacao = signal(false);

  /** RN-068 — abre a confirmação do fechamento com o valor final calculado. */
  confirmarFechamento(): void {
    const c = this.comanda();
    if (!c || this.descontoInvalido() || this.salvando()) return;

    const valor = this.descontoValor();
    const payload = {
      desconto:
        valor !== null && !isNaN(valor) && valor > 0 && !this.descontoInvalido()
          ? { tipo: this.descontoTipo(), valor }
          : undefined,
      observacoes: this.observacoes().trim() || undefined,
    };

    this.confirmacao.set({
      titulo: 'Fechar comanda',
      mensagem: `Fechar a comanda #${c.numero}? Valor final: R$ ${this.valorFinal().toFixed(2).replace('.', ',')}`,
      confirmLabel: 'Fechar comanda',
      confirmClass: 'btn-success',
      icon: 'fa-solid fa-file-invoice-dollar',
      acao: async () => {
        this.salvando.set(true);
        try {
          await firstValueFrom(this.comandaService.fechar(c.id, payload));
          this.toastService.success('Comanda fechada.');
          this.router.navigate(['/gestao/comandas', c.id]);
        } catch {
          // Erro específico (desconto > total etc.) já exibido pelo interceptor.
        } finally {
          this.salvando.set(false);
        }
      },
    });
  }

  protected async executarConfirmacao(): Promise<void> {
    const config = this.confirmacao();
    if (!config || this.executandoConfirmacao()) return;
    this.executandoConfirmacao.set(true);
    try {
      await config.acao();
      this.confirmacao.set(null);
    } finally {
      this.executandoConfirmacao.set(false);
    }
  }

  protected cancelarConfirmacao(): void {
    this.confirmacao.set(null);
  }
}

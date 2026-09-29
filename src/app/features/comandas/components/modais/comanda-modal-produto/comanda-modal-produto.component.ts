import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TmModalComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { EstoqueService } from '../../../../../core/services/estoque.service';
import { ProdutoEstoque } from '../../../../../core/models/estoque/estoque.model';
import { AdicionarProdutoRequest } from '../../../../../core/models/comanda/comanda.model';

@Component({
  selector: 'app-comanda-modal-produto',
  standalone: true,
  imports: [CommonModule, FormsModule, TmModalComponent, TmTextComponent, CurrencyPipe],
  templateUrl: './comanda-modal-produto.component.html',
  styleUrl: './comanda-modal-produto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComandaModalProdutoComponent {
  private readonly estoqueService = inject(EstoqueService);

  readonly show = model<boolean>(false);

  readonly confirm = output<AdicionarProdutoRequest>();
  readonly cancel = output<void>();

  protected readonly busca = signal('');
  protected readonly selecionado = signal<ProdutoEstoque | null>(null);
  protected readonly quantidade = signal<number>(1);
  protected readonly observacoes = signal('');
  protected readonly carregando = signal(false);

  private readonly _produtos = signal<ProdutoEstoque[]>([]);
  protected readonly produtos = this._produtos.asReadonly();

  protected readonly resultados = computed<ProdutoEstoque[]>(() => {
    const termo = this.busca().trim().toLowerCase();
    const lista = this._produtos();
    if (!termo) {
      return lista;
    }
    return lista.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.marca?.toLowerCase().includes(termo) ?? false) ||
        (p.codigoBarras?.toLowerCase().includes(termo) ?? false),
    );
  });

  /** Bloqueia quantidade acima do saldo — o backend valida de novo (400 estoque insuficiente). */
  protected readonly quantidadeExcedeSaldo = computed(() => {
    const p = this.selecionado();
    return !!p && this.quantidade() > p.quantidadeAtual;
  });

  protected readonly podeConfirmar = computed(
    () => !!this.selecionado() && this.quantidade() >= 1 && !this.quantidadeExcedeSaldo(),
  );

  constructor() {
    effect(() => {
      if (this.show()) {
        this.reset();
        void this.carregarProdutos();
      }
    });
  }

  private reset(): void {
    this.busca.set('');
    this.selecionado.set(null);
    this.quantidade.set(1);
    this.observacoes.set('');
  }

  private async carregarProdutos(): Promise<void> {
    this.carregando.set(true);
    try {
      await this.estoqueService.carregarProdutos();
    } finally {
      this.carregando.set(false);
    }
  }

  protected selecionar(produto: ProdutoEstoque): void {
    this.selecionado.set(produto);
    this.quantidade.set(1);
  }

  protected limparSelecao(): void {
    this.selecionado.set(null);
    this.quantidade.set(1);
  }

  confirmar(): void {
    const produto = this.selecionado();
    if (!produto || !this.podeConfirmar()) {
      return;
    }
    this.confirm.emit({
      produtoId: produto.id,
      quantidade: this.quantidade(),
      observacoes: this.observacoes().trim() || undefined,
    });
    this.show.set(false);
  }

  protected fechar(): void {
    this.show.set(false);
    this.cancel.emit();
  }
}

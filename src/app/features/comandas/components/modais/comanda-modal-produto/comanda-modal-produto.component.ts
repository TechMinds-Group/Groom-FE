import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TmModalComponent, TmSelectComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { EstoqueService } from '../../../../../core/services/estoque.service';
import { ProdutoEstoque } from '../../../../../core/models/estoque/estoque.model';
import { AdicionarProdutoRequest } from '../../../../../core/models/comanda/comanda.model';
import { ThemeService } from '../../../../../core/services/theme.service';

@Component({
  selector: 'app-comanda-modal-produto',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TmModalComponent, TmSelectComponent, TmTextComponent, CurrencyPipe],
  templateUrl: './comanda-modal-produto.component.html',
  styleUrl: './comanda-modal-produto.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComandaModalProdutoComponent {
  private readonly estoqueService = inject(EstoqueService);
  protected readonly themeService = inject(ThemeService);

  readonly show = model<boolean>(false);

  readonly confirm = output<AdicionarProdutoRequest>();
  readonly cancel = output<void>();

  /** Seleção do produto via tm-select com busca (nome, marca e código no label). */
  protected readonly produtoControl = new FormControl<string>('', { nonNullable: true });
  /** Espelho em signal do control — FormControl não é rastreável por computed. */
  protected readonly produtoSelecionadoId = signal<string>('');
  protected readonly quantidade = signal<number>(1);
  protected readonly observacoes = signal('');
  protected readonly carregando = signal(false);

  /** Fonte única: o signal público do EstoqueService (carregarProdutos o popula). */
  protected readonly produtos = this.estoqueService.produtos;

  protected readonly produtoOptions = computed(() =>
    this.produtos().map((p) => ({
      value: p.id,
      label: `${p.nome} — R$ ${this.formatarPreco(p.precoVenda)} (Saldo: ${p.quantidadeAtual} ${p.unidadeMedida})`,
    })),
  );

  protected readonly selecionado = computed<ProdutoEstoque | null>(() => {
    const id = this.produtoSelecionadoId();
    return this.produtos().find((p) => p.id === id) ?? null;
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
    // FormControl não é rastreável por computed — espelha no signal a cada mudança.
    this.produtoControl.valueChanges.subscribe((v) => {
      this.produtoSelecionadoId.set(v ?? '');
    });

    effect(() => {
      if (this.show()) {
        this.produtoControl.setValue('');
        this.produtoSelecionadoId.set('');
        this.quantidade.set(1);
        this.observacoes.set('');
        void this.carregarProdutos();
      }
    });
  }

  private formatarPreco(valor: number): string {
    return valor.toFixed(2).replace('.', ',');
  }

  private async carregarProdutos(): Promise<void> {
    this.carregando.set(true);
    try {
      await this.estoqueService.carregarProdutos();
    } finally {
      this.carregando.set(false);
    }
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

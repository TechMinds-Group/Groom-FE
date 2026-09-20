import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { EstoqueService } from '../../../../../core/services/estoque.service';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';
import {
  ProdutoEstoque,
  AtualizarProdutoEstoque,
  CATEGORIAS_ESTOQUE,
  UNIDADES_MEDIDA,
  MovimentacaoEstoque,
  RegistrarMovimentacao,
} from '../../../../../core/models/estoque/estoque.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { EstoqueModalMovimentacaoComponent } from '../modais/estoque-modal-movimentacao/estoque-modal-movimentacao.component';
import { ImageViewerModalComponent } from '../../../../../shared/modais/image-viewer-modal/image-viewer-modal.component';
import { BarcodeScannerModalComponent } from '../../../../../shared/modais/barcode-scanner-modal/barcode-scanner-modal.component';

@Component({
  selector: 'app-estoque-detalhe',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    DatePipe,
    EstoqueModalMovimentacaoComponent,
    ImageViewerModalComponent,
    BarcodeScannerModalComponent,
  ],
  templateUrl: './estoque-detalhe.component.html',
  styleUrls: ['./estoque-detalhe.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstoqueDetalheComponent implements OnInit {
  private readonly estoqueService = inject(EstoqueService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly categorias = CATEGORIAS_ESTOQUE;
  protected readonly unidades = UNIDADES_MEDIDA;

  protected readonly produto = signal<ProdutoEstoque | null>(null);
  protected readonly editando = signal(false);
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly enviandoImagem = signal(false);
  protected readonly showBarcodeScanner = signal(false);

  onBarcodeScanned(code: string): void {
    if (this.editando()) {
      this.updateForm({ codigoBarras: code });
    }
    this.toastService.success(`Código de barras escaneado: ${code}`);
  }

  protected readonly form = signal<AtualizarProdutoEstoque | null>(null);

  protected readonly showMovimentacaoModal = signal(false);
  protected readonly movimentacoes = signal<MovimentacaoEstoque[]>([]);
  protected readonly carregandoMovimentacoes = signal(false);

  protected readonly showImageViewer = signal<boolean>(false);
  protected readonly imageViewerImages = signal<string[]>([]);
  protected readonly imageViewerTitle = signal<string>('');

  protected resolverImagemUrl(url?: string): string {
    if (!url) return '';
    return this.estabelecimentoService.resolverUrl(url);
  }

  protected abrirImagemModal(p: ProdutoEstoque): void {
    if (!p.imagemUrl) return;
    this.imageViewerImages.set([this.resolverImagemUrl(p.imagemUrl)]);
    this.imageViewerTitle.set(p.nome);
    this.showImageViewer.set(true);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const prodId = this.produto()?.id;
    if (!prodId || !input.files || !input.files[0]) return;

    const file = input.files[0];
    if (file.size > 3 * 1024 * 1024) {
      this.toastService.error('A imagem excede o tamanho máximo permitido de 3MB.');
      input.value = '';
      return;
    }

    const extensao = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extensao)) {
      this.toastService.error('Formato inválido (apenas .jpg, .png, .webp, .gif).');
      input.value = '';
      return;
    }

    this.enviandoImagem.set(true);
    try {
      const res = await this.estoqueService.uploadImagem(prodId, file);
      this.toastService.success('Imagem atualizada com sucesso!');
      await this.carregarProduto(prodId);
    } catch {
      this.toastService.error('Erro ao enviar a imagem.');
    } finally {
      this.enviandoImagem.set(false);
      input.value = '';
    }
  }

  async removerImagemProduto(): Promise<void> {
    const prodId = this.produto()?.id;
    if (!prodId) return;

    if (!confirm('Deseja remover a imagem deste produto?')) return;

    this.enviandoImagem.set(true);
    try {
      await this.estoqueService.removerImagem(prodId);
      this.toastService.success('Imagem removida.');
      await this.carregarProduto(prodId);
    } catch {
      this.toastService.error('Erro ao remover imagem.');
    } finally {
      this.enviandoImagem.set(false);
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregarProduto(id);
      this.carregarMovimentacoes(id);
    } else {
      this.router.navigate(['/gestao/estoque']);
    }
  }

  async carregarProduto(id: string): Promise<void> {
    this.carregando.set(true);
    try {
      const p = await this.estoqueService.obterPorId(id);
      this.produto.set(p);
    } catch {
      this.toastService.error('Produto não encontrado.');
      this.router.navigate(['/gestao/estoque']);
    } finally {
      this.carregando.set(false);
    }
  }

  async carregarMovimentacoes(produtoId: string): Promise<void> {
    this.carregandoMovimentacoes.set(true);
    try {
      const movs = await this.estoqueService.obterMovimentacoesPorProduto(produtoId);
      this.movimentacoes.set(movs);
    } catch {
      // Ignora erro se não houver movimentações
    } finally {
      this.carregandoMovimentacoes.set(false);
    }
  }

  abrirModalMovimentacao(): void {
    this.showMovimentacaoModal.set(false);
    setTimeout(() => this.showMovimentacaoModal.set(true), 0);
  }

  async salvarMovimentacao(payload: RegistrarMovimentacao): Promise<void> {
    try {
      const nomeResp = this.authService.currentUser()?.nome || 'Operador';
      await this.estoqueService.registrarMovimentacao({
        ...payload,
        responsavelNome: nomeResp,
      });
      this.toastService.success('Movimentação registrada com sucesso!');
      this.showMovimentacaoModal.set(false);
      const prodId = this.produto()?.id;
      if (prodId) {
        await this.carregarProduto(prodId);
        await this.carregarMovimentacoes(prodId);
      }
    } catch (err: any) {
      console.error('Erro ao registrar movimentação', err);
      const mensagem = err?.error?.message || err?.error?.Message || err?.error?.detail || (typeof err?.error === 'string' ? err.error : null) || err?.message || 'Erro ao registrar movimentação.';
      this.toastService.error(mensagem, 'Falha no lançamento');
    }
  }

  iniciarEdicao(): void {
    const p = this.produto();
    if (!p) return;
    this.form.set({
      nome: p.nome,
      categoria: p.categoria,
      codigoBarras: p.codigoBarras,
      marca: p.marca,
      unidadeMedida: p.unidadeMedida,
      quantidadeMinima: p.quantidadeMinima,
      precoCusto: p.precoCusto,
      precoVenda: p.precoVenda,
      dataValidade: p.dataValidade ? p.dataValidade.split('T')[0] : undefined,
      status: p.status,
      imagemUrl: p.imagemUrl,
    });
    this.editando.set(true);
  }

  cancelarEdicao(): void {
    this.editando.set(false);
    this.form.set(null);
  }

  updateForm(partial: Partial<AtualizarProdutoEstoque>): void {
    this.form.update((f) => (f ? { ...f, ...partial } : f));
  }

  async salvar(): Promise<void> {
    const id = this.produto()?.id;
    const dto = this.form();
    if (!id || !dto) return;

    if (!dto.nome || !dto.nome.trim()) {
      this.toastService.error('Nome do produto é obrigatório.');
      return;
    }

    this.salvando.set(true);
    try {
      const updated = await this.estoqueService.atualizar(id, dto);
      this.produto.set(updated);
      this.editando.set(false);
      this.toastService.success('Produto atualizado com sucesso.');
    } catch {
      this.toastService.error('Erro ao atualizar produto.');
    } finally {
      this.salvando.set(false);
    }
  }

  async excluir(): Promise<void> {
    const p = this.produto();
    if (!p) return;
    if (!confirm(`Deseja excluir o produto "${p.nome}"?`)) return;

    try {
      await this.estoqueService.remover(p.id);
      this.toastService.success('Produto excluído.');
      this.router.navigate(['/gestao/estoque']);
    } catch {
      this.toastService.error('Erro ao excluir produto.');
    }
  }

  voltar(): void {
    this.router.navigate(['/gestao/estoque']);
  }
}

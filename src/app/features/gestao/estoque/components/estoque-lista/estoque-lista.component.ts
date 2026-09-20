import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableColumn, TmTableComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { EstoqueService } from '../../../../../core/services/estoque.service';
import { ProdutoEstoque, CATEGORIAS_ESTOQUE } from '../../../../../core/models/estoque/estoque.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { BarcodeScannerModalComponent } from '../../../../../shared/modais/barcode-scanner-modal/barcode-scanner-modal.component';

@Component({
  selector: 'app-estoque-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, TmTableComponent, CurrencyPipe, BarcodeScannerModalComponent],
  templateUrl: './estoque-lista.component.html',
  styleUrls: ['./estoque-lista.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstoqueListaComponent implements OnInit, AfterViewInit {
  protected readonly estoqueService = inject(EstoqueService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);

  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly categorias = CATEGORIAS_ESTOQUE;

  protected readonly busca = signal('');
  protected readonly categoriaSelecionada = signal('');
  protected readonly apenasAlertas = signal(false);
  protected readonly tamanhoPagina = signal<number>(10);
  protected readonly showBarcodeScanner = signal(false);

  onBarcodeScanned(code: string): void {
    this.busca.set(code);
    this.carregar();
    this.toastService.success(`Pesquisando por código: ${code}`);
  }

  @ViewChild('produtoTemplate', { static: true })
  produtoTemplate!: TemplateRef<{ $implicit: ProdutoEstoque }>;

  @ViewChild('saldoTemplate', { static: true })
  saldoTemplate!: TemplateRef<{ $implicit: ProdutoEstoque }>;

  @ViewChild('custoTemplate', { static: true })
  custoTemplate!: TemplateRef<{ $implicit: ProdutoEstoque }>;

  @ViewChild('vendaTemplate', { static: true })
  vendaTemplate!: TemplateRef<{ $implicit: ProdutoEstoque }>;

  @ViewChild('validadeTemplate', { static: true })
  validadeTemplate!: TemplateRef<{ $implicit: ProdutoEstoque }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: ProdutoEstoque }>;

  private readonly templatesReady = signal(false);

  protected readonly cols = computed<TableColumn<ProdutoEstoque>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Produto', template: this.produtoTemplate, width: '30%' },
      { header: 'Qtd. em Estoque', template: this.saldoTemplate, width: '15%' },
      { header: 'Preço Custo', template: this.custoTemplate, width: '15%' },
      { header: 'Preço Venda', template: this.vendaTemplate, width: '15%' },
      { header: 'Validade', template: this.validadeTemplate, width: '15%' },
      { header: 'Status', template: this.statusTemplate, width: '10%' },
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  async carregar(): Promise<void> {
    try {
      await this.estoqueService.carregarProdutos(
        this.busca() || undefined,
        this.categoriaSelecionada() || undefined,
        this.apenasAlertas()
      );
    } catch {
      this.toastService.error('Erro ao carregar os produtos do estoque.');
    }
  }

  verDetalhes(item: ProdutoEstoque): void {
    this.router.navigate(['/gestao/estoque', item.id]);
  }

  abrirNovo(): void {
    this.router.navigate(['/gestao/estoque/novo']);
  }
}

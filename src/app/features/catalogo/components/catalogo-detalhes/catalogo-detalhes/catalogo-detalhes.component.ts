import { ChangeDetectionStrategy, Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';
import { ServicoCatalogo } from '../../../../../core/models/catalogo/servico.model';
import { CatalogoModalExcluirComponent } from '../../modais/catalogo-modal-excluir/catalogo-modal-excluir.component';
import { ImageViewerModalComponent } from '../../../../../shared/modais/image-viewer-modal/image-viewer-modal.component';

@Component({
  selector: 'app-catalogo-detalhes',
  standalone: true,
  imports: [CommonModule, CatalogoModalExcluirComponent, ImageViewerModalComponent],
  templateUrl: './catalogo-detalhes.component.html',
  styleUrl: './catalogo-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoDetalhesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly catalogoService = inject(CatalogoService);
  protected readonly estabelecimentoService = inject(EstabelecimentoService);

  protected readonly servico = signal<ServicoCatalogo | null>(null);

  protected readonly showDeleteConfirmModal = signal<boolean>(false);
  protected readonly showImageViewer = signal<boolean>(false);
  protected readonly imageViewerImages = signal<string[]>([]);
  protected readonly imageViewerTitle = signal<string>('');

  protected obterImagensValidas(s: ServicoCatalogo): string[] {
    const raw = [s.imagemUrl, s.imagemUrl2, s.imagemUrl3].filter(Boolean) as string[];
    return raw.map(url => this.estabelecimentoService.resolverUrl(url));
  }

  protected abrirImagemModal(s: ServicoCatalogo): void {
    const imgs = this.obterImagensValidas(s);
    if (imgs.length === 0) return;
    this.imageViewerImages.set(imgs);
    this.imageViewerTitle.set(s.nome);
    this.showImageViewer.set(true);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregarServico(id);
    }
  }

  voltar(): void {
    this.router.navigate(['/servicos/catalogo']);
  }

  abrirEdicao(): void {
    const id = this.servico()?.id;
    if (id) {
      this.router.navigate(['/servicos/catalogo', id, 'editar']);
    }
  }

  excluir(): void {
    this.showDeleteConfirmModal.set(true);
  }

  async confirmarExcluir(): Promise<void> {
    const s = this.servico();
    if (!s) return;

    await this.catalogoService.remover(s.id);
    this.showDeleteConfirmModal.set(false);
    this.voltar();
  }

  private async carregarServico(id: string): Promise<void> {
    try {
      if (this.catalogoService.servicos().length === 0) {
        await this.catalogoService.carregarServicos();
      }
      const s = this.catalogoService.servicos().find((c) => c.id === id);
      if (s) {
        this.servico.set(s);
      } else {
        this.router.navigate(['/servicos/catalogo']);
      }
    } catch {
      this.router.navigate(['/servicos/catalogo']);
    }
  }
}

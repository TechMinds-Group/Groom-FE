import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClubesService, ClubeConfig } from '../../../../core/services/clubes.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { PlanoModalExcluirComponent } from '../modais/plano-modal-excluir/plano-modal-excluir.component';
import { ImageViewerModalComponent } from '../../../../shared/modais/image-viewer-modal/image-viewer-modal.component';

@Component({
  selector: 'app-plano-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    PlanoModalExcluirComponent,
    ImageViewerModalComponent,
  ],
  templateUrl: './plano-detalhes.component.html',
  styleUrl: './plano-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanoDetalhesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clubesService = inject(ClubesService);
  protected readonly estabelecimentoService = inject(EstabelecimentoService);

  protected readonly clube = signal<ClubeConfig | null>(null);
  protected readonly showDeleteModal = signal<boolean>(false);
  protected readonly showImageViewer = signal<boolean>(false);
  protected readonly imageViewerImages = signal<string[]>([]);
  protected readonly imageViewerTitle = signal<string>('');

  protected obterImagensValidas(plano: ClubeConfig): string[] {
    const raw = [plano.imagemUrl, plano.imagemUrl2, plano.imagemUrl3].filter(Boolean) as string[];
    return raw.map(url => this.estabelecimentoService.resolverUrl(url));
  }

  protected abrirImagemModal(plano: ClubeConfig): void {
    const imgs = this.obterImagensValidas(plano);
    if (imgs.length === 0) return;
    this.imageViewerImages.set(imgs);
    this.imageViewerTitle.set(plano.nome);
    this.showImageViewer.set(true);
  }

  protected readonly recursosExibicao = computed<string[]>(() => {
    const recursos = this.clube()?.recursos ?? [];
    return [...new Set(recursos)];
  });

  protected formatarDuracao(minutos?: number): string {
    if (!minutos || minutos <= 0) return '0 min';
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const rest = minutos % 60;
    return rest > 0 ? `${horas}h ${rest}min` : `${horas}h`;
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.carregarClube(id);
    }
  }

  voltar(): void {
    this.router.navigate(['/servicos/planos-estabelecimento']);
  }

  abrirEdicao(): void {
    const id = this.clube()?.id;
    if (id) {
      this.router.navigate(['/servicos/planos-estabelecimento', id, 'editar']);
    }
  }

  abrirExclusao(): void {
    this.showDeleteModal.set(true);
  }

  async confirmarExclusao(): Promise<void> {
    const id = this.clube()?.id;
    if (id) {
      try {
        await firstValueFrom(this.clubesService.excluir(id));
        this.showDeleteModal.set(false);
        this.voltar();
      } catch (err) {
        console.error('Erro ao excluir plano');
      }
    }
  }

  private async carregarClube(id: string): Promise<void> {
    try {
      if (this.clubesService.clubes().length === 0) {
        await firstValueFrom(this.clubesService.carregarClubes());
      }
      const plano = this.clubesService.clubes().find((c) => c.id === id);
      if (plano) {
        this.clube.set(plano);
      } else {
        this.router.navigate(['/servicos/planos-estabelecimento']);
      }
    } catch (err) {
      console.error('Erro ao carregar plano');
      this.router.navigate(['/servicos/planos-estabelecimento']);
    }
  }
}
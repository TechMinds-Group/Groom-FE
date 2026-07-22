import { ChangeDetectionStrategy, Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { ServicoCatalogo } from '../../../../../core/models/catalogo/servico.model';
import {
  CatalogoModalEditarComponent,
  ServicoEdicaoPayload,
} from '../../modais/catalogo-modal-editar/catalogo-modal-editar.component';
import { CatalogoModalExcluirComponent } from '../../modais/catalogo-modal-excluir/catalogo-modal-excluir.component';

@Component({
  selector: 'app-catalogo-detalhes',
  standalone: true,
  imports: [CommonModule, CatalogoModalEditarComponent, CatalogoModalExcluirComponent],
  templateUrl: './catalogo-detalhes.component.html',
  styleUrl: './catalogo-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoDetalhesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly catalogoService = inject(CatalogoService);

  protected readonly servico = signal<ServicoCatalogo | null>(null);

  protected readonly showEditModal = signal<boolean>(false);
  protected readonly showDeleteConfirmModal = signal<boolean>(false);

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
    this.showEditModal.set(true);
  }

  async salvarEdicao(payload: ServicoEdicaoPayload): Promise<void> {
    const s = this.servico();
    if (!s) return;

    await this.catalogoService.atualizar(s.id, payload);
    this.showEditModal.set(false);
    await this.carregarServico(s.id);
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

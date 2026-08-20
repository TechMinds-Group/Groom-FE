import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClubesService, ClubeConfig } from '../../../../core/services/clubes.service';
import { PlanoModalExcluirComponent } from '../modais/plano-modal-excluir/plano-modal-excluir.component';

@Component({
  selector: 'app-plano-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    PlanoModalExcluirComponent,
  ],
  templateUrl: './plano-detalhes.component.html',
  styleUrl: './plano-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanoDetalhesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clubesService = inject(ClubesService);

  protected readonly clube = signal<ClubeConfig | null>(null);
  protected readonly showDeleteModal = signal<boolean>(false);

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
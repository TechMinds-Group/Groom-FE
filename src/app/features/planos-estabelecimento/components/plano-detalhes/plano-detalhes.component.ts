import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClubesService, ClubeConfig } from '../../../../core/services/clubes.service';
import { BeneficiosService } from '../../../../core/services/beneficios.service';
import { PlanoModalEditarComponent, PlanoEdicaoPayload } from '../modais/plano-modal-editar/plano-modal-editar.component';
import { PlanoModalExcluirComponent } from '../modais/plano-modal-excluir/plano-modal-excluir.component';

@Component({
  selector: 'app-plano-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    PlanoModalEditarComponent,
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
  protected readonly beneficiosService = inject(BeneficiosService);

  protected readonly clube = signal<ClubeConfig | null>(null);
  protected readonly showFormModal = signal<boolean>(false);
  protected readonly showDeleteModal = signal<boolean>(false);
  protected readonly opcoesBeneficios = signal<{ value: string; label: string }[]>([]);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.carregarClube(id);
    }
    await this.carregarBeneficiosGlobais();
  }

  voltar(): void {
    this.router.navigate(['/servicos/planos-estabelecimento']);
  }

  abrirEdicao(): void {
    this.showFormModal.set(true);
  }

  abrirExclusao(): void {
    this.showDeleteModal.set(true);
  }

  async salvar(payload: PlanoEdicaoPayload): Promise<void> {
    const id = this.clube()?.id;
    if (!id) return;
    try {
      await firstValueFrom(this.clubesService.atualizar(id, payload));
      this.showFormModal.set(false);
      await this.carregarClube(id);
    } catch (err) {
      console.error('Erro ao salvar plano');
    }
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

  adicionarNovoBeneficio(val: string): void {
    const exists = this.opcoesBeneficios().some((o) => o.label.toLowerCase() === val.toLowerCase());
    if (!exists) {
      this.opcoesBeneficios.update((opts) => [...opts, { value: val, label: val }]);
      this.beneficiosService.addBeneficio(val).subscribe();
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

  private async carregarBeneficiosGlobais(): Promise<void> {
    try {
      const beneficios = await firstValueFrom(this.beneficiosService.getBeneficios());
      this.opcoesBeneficios.set(beneficios.map((b: string) => ({ value: b, label: b })));
    } catch {
      this.opcoesBeneficios.set([]);
    }
  }
}
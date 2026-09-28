import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { ComandaService } from '../../../../core/services/comanda.service';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Comanda, ComandaItem } from '../../../../core/models/comanda/comanda.model';
import { STATUS_COMANDA_BADGE } from '../../models/comanda-status-config.model';
import { ComandaModalProdutoComponent } from '../modais/comanda-modal-produto/comanda-modal-produto.component';
import { ComandaModalServicoComponent } from '../modais/comanda-modal-servico/comanda-modal-servico.component';

@Component({
  selector: 'app-comanda-detalhes',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ComandaModalProdutoComponent, ComandaModalServicoComponent],
  templateUrl: './comanda-detalhes.component.html',
  styleUrls: ['./comanda-detalhes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComandaDetalhesComponent implements OnInit {
  private readonly comandaService = inject(ComandaService);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isAdmin = this.authService.isAdmin;
  protected readonly statusBadge = STATUS_COMANDA_BADGE;

  readonly comanda = signal<Comanda | null>(null);
  readonly carregando = signal(true);
  protected readonly processando = signal(false);

  protected readonly showProdutoModal = signal(false);
  protected readonly showServicoModal = signal(false);

  /** `itens` vem `null` do backend quando vazio — tratado como lista vazia. */
  readonly itens = computed<ComandaItem[]>(() => this.comanda()?.itens ?? []);

  readonly comandaAberta = computed(() => this.comanda()?.status === 'Aberta');

  /** Nome do profissional por id (padrão agenda: resolved no FE via GestaoUsuariosService). */
  private readonly profissionaisMap = computed(() => {
    const map = new Map<string, string>();
    for (const u of this.gestaoUsuariosService.usuarios()) {
      map.set(u.id, u.sobrenome ? `${u.nome} ${u.sobrenome}` : u.nome);
    }
    return map;
  });

  protected readonly descontoLabel = computed(() => {
    const c = this.comanda();
    if (!c || c.valorDesconto <= 0) {
      return '';
    }
    return c.tipoDesconto === 'percentual' ? 'Desconto (percentual)' : 'Desconto (valor)';
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.carregar(id);
      void this.gestaoUsuariosService.carregarUsuarios();
    } else {
      this.router.navigate(['/gestao/comandas']);
    }
  }

  private async carregar(id: string): Promise<void> {
    this.carregando.set(true);
    try {
      const c = await firstValueFrom(this.comandaService.getComanda(id));
      this.comanda.set(c);
    } catch {
      this.toastService.error('Comanda não encontrada.');
      this.router.navigate(['/gestao/comandas']);
    } finally {
      this.carregando.set(false);
    }
  }

  protected resolverNomeProfissional(item: ComandaItem): string {
    if (item.tipo !== 'servico' || !item.profissionalId) {
      return '—';
    }
    return this.profissionaisMap().get(item.profissionalId) ?? 'Profissional removido';
  }

  protected voltar(): void {
    this.router.navigate(['/gestao/comandas']);
  }

  protected fecharComanda(): void {
    const c = this.comanda();
    if (!c) return;
    this.router.navigate(['/gestao/comandas', c.id, 'fechar']);
  }

  protected async removerItem(item: ComandaItem): Promise<void> {
    const c = this.comanda();
    if (!c || !this.comandaAberta()) return;
    if (!confirm(`Remover o item "${item.nomeItem}" da comanda?`)) return;

    this.processando.set(true);
    try {
      await firstValueFrom(this.comandaService.removerItem(c.id, item.id));
      this.toastService.success('Item removido.');
      await this.carregar(c.id);
    } catch {
      // Erro específico (estoque/permissão) já exibido pelo interceptor.
    } finally {
      this.processando.set(false);
    }
  }

  protected async cancelarComanda(): Promise<void> {
    const c = this.comanda();
    if (!c || !this.comandaAberta()) return;
    if (!confirm(`Cancelar a comanda #${c.numero}? Os produtos serão estornados ao estoque.`)) return;

    this.processando.set(true);
    try {
      await firstValueFrom(this.comandaService.cancelar(c.id));
      this.toastService.success('Comanda cancelada.');
      await this.carregar(c.id);
    } catch {
      // Erro específico já exibido pelo interceptor.
    } finally {
      this.processando.set(false);
    }
  }

  /** Requer perfil de Administrador (backend retorna 403 para não admin). */
  async reabrirComanda(): Promise<void> {
    const c = this.comanda();
    if (!c || !this.isAdmin()) return;
    if (!confirm(`Reabrir a comanda #${c.numero}? O desconto aplicado será removido.`)) return;

    this.processando.set(true);
    try {
      await firstValueFrom(this.comandaService.reabrir(c.id));
      this.toastService.success('Comanda reaberta.');
      await this.carregar(c.id);
    } catch {
      // Erro específico já exibido pelo interceptor.
    } finally {
      this.processando.set(false);
    }
  }

  protected async onProdutoConfirm(request: { produtoId: string; quantidade: number; observacoes?: string }): Promise<void> {
    const c = this.comanda();
    if (!c) return;
    this.processando.set(true);
    try {
      await firstValueFrom(this.comandaService.adicionarProduto(c.id, request));
      this.toastService.success('Produto adicionado à comanda.');
      await this.carregar(c.id);
    } catch {
      // Erro específico (estoque insuficiente) já exibido pelo interceptor.
    } finally {
      this.processando.set(false);
    }
  }

  protected async onServicoConfirm(request: { servicoId: string; profissionalId: string; observacoes?: string }): Promise<void> {
    const c = this.comanda();
    if (!c) return;
    this.processando.set(true);
    try {
      await firstValueFrom(this.comandaService.adicionarServico(c.id, request));
      this.toastService.success('Serviço adicionado à comanda.');
      await this.carregar(c.id);
    } catch {
      // Erro específico já exibido pelo interceptor.
    } finally {
      this.processando.set(false);
    }
  }
}

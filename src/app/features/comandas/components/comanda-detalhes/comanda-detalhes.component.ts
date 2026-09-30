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
import {
  ConfirmacaoConfig,
  ModalConfirmacaoComponent,
} from '../../../../shared/components/modais/modal-confirmacao/modal-confirmacao.component';

@Component({
  selector: 'app-comanda-detalhes',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ComandaModalProdutoComponent, ComandaModalServicoComponent, ModalConfirmacaoComponent],
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

  /** Há ação exibida no card Ações Rápidas (define a largura da coluna principal). */
  readonly temAcoes = computed(() => {
    const c = this.comanda();
    if (!c) return false;
    return this.comandaAberta() || (c.status === 'Fechada' && this.isAdmin());
  });

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

  // ── Confirmações via modal da lib (substitui o confirm() nativo do navegador) ──

  protected readonly confirmacao = signal<ConfirmacaoConfig | null>(null);
  protected readonly executandoConfirmacao = signal(false);

  protected solicitarConfirmacao(config: ConfirmacaoConfig): void {
    this.confirmacao.set(config);
  }

  protected async confirmarAcao(): Promise<void> {
    const config = this.confirmacao();
    if (!config || this.executandoConfirmacao()) {
      return;
    }
    this.executandoConfirmacao.set(true);
    try {
      await config.acao();
      this.confirmacao.set(null);
    } finally {
      this.executandoConfirmacao.set(false);
    }
  }

  protected cancelarAcao(): void {
    this.confirmacao.set(null);
  }

  protected removerItem(item: ComandaItem): void {
    const c = this.comanda();
    if (!c || !this.comandaAberta()) return;
    this.solicitarConfirmacao({
      titulo: 'Remover item',
      mensagem: `Remover o item "${item.nomeItem}" da comanda?`,
      confirmLabel: 'Remover',
      confirmClass: 'btn-danger',
      icon: 'fa-solid fa-trash-can',
      acao: async () => {
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
      },
    });
  }

  protected cancelarComanda(): void {
    const c = this.comanda();
    if (!c || !this.comandaAberta()) return;
    this.solicitarConfirmacao({
      titulo: 'Cancelar comanda',
      mensagem: `Cancelar a comanda #${c.numero}? Os produtos serão estornados ao estoque.`,
      confirmLabel: 'Cancelar comanda',
      confirmClass: 'btn-danger',
      icon: 'fa-solid fa-ban',
      acao: async () => {
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
      },
    });
  }

  /** Requer perfil de Administrador (backend retorna 403 para não admin). */
  reabrirComanda(): void {
    const c = this.comanda();
    if (!c || !this.isAdmin()) return;
    this.solicitarConfirmacao({
      titulo: 'Reabrir comanda',
      mensagem: `Reabrir a comanda #${c.numero}? O desconto aplicado será removido.`,
      confirmLabel: 'Reabrir',
      confirmClass: 'btn-warning',
      icon: 'fa-solid fa-rotate-left',
      acao: async () => {
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
      },
    });
  }

  protected async onProdutoConfirm(request: { produtoId: string; quantidade: number; observacoes?: string }): Promise<void> {
    const c = this.comanda();
    console.log('[ComandaDetalhes] onProdutoConfirm', { request, comandaId: c?.id, comandaAberta: this.comandaAberta() });
    if (!c) {
      console.warn('[ComandaDetalhes] sem comanda carregada — abortando');
      return;
    }
    this.processando.set(true);
    try {
      await firstValueFrom(this.comandaService.adicionarProduto(c.id, request));
      console.log('[ComandaDetalhes] produto adicionado com sucesso');
      this.toastService.success('Produto adicionado à comanda.');
      await this.carregar(c.id);
    } catch (err) {
      console.error('[ComandaDetalhes] falha ao adicionar produto', err);
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

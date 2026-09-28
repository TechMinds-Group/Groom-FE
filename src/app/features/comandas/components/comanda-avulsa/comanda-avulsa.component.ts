import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { ComandaService } from '../../../../core/services/comanda.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { Cliente } from '../../../../core/models/clientes/cliente.model';

@Component({
  selector: 'app-comanda-avulsa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comanda-avulsa.component.html',
  styleUrls: ['./comanda-avulsa.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComandaAvulsaComponent implements OnInit {
  private readonly comandaService = inject(ComandaService);
  private readonly clientesService = inject(ClientesService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);

  readonly buscaCliente = signal('');
  protected readonly clienteSelecionado = signal<Cliente | null>(null);
  protected readonly nomeLivre = signal('');
  protected readonly observacoes = signal('');
  readonly carregando = signal(true);
  protected readonly salvando = signal(false);

  private readonly _clientes = signal<Cliente[]>([]);
  protected readonly clientes = this._clientes.asReadonly();

  /** Busca de cliente por nome ou celular (client-side, padrão ClientesService em memória). */
  readonly resultados = computed<Cliente[]>(() => {
    const termo = this.buscaCliente().trim().toLowerCase();
    const lista = this._clientes();
    if (!termo) {
      return [];
    }
    return lista
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          (c.celular || '').toLowerCase().includes(termo),
      )
      .slice(0, 8);
  });

  async ngOnInit(): Promise<void> {
    this.carregando.set(true);
    try {
      await this.clientesService.carregarClientes();
      this._clientes.set(this.clientesService.clientes());
    } catch {
      this.toastService.error('Erro ao carregar os clientes.');
    } finally {
      this.carregando.set(false);
    }
  }

  protected selecionar(cliente: Cliente): void {
    this.clienteSelecionado.set(cliente);
    this.buscaCliente.set('');
    this.nomeLivre.set('');
  }

  protected limparSelecao(): void {
    this.clienteSelecionado.set(null);
  }

  protected voltar(): void {
    this.router.navigate(['/gestao/comandas']);
  }

  async cadastrar(): Promise<void> {
    const selecionado = this.clienteSelecionado();
    const nomeLivre = this.nomeLivre().trim();
    const observacoes = this.observacoes().trim();

    const payload = {
      clienteId: selecionado?.id,
      clienteNome: !selecionado && nomeLivre ? nomeLivre : undefined,
      observacoes: observacoes || undefined,
    };

    this.salvando.set(true);
    try {
      const comanda = await firstValueFrom(this.comandaService.criarAvulsa(payload));
      this.toastService.success(`Comanda #${comanda.numero} aberta.`);
      this.router.navigate(['/gestao/comandas', comanda.id]);
    } catch {
      // Cliente inexistente (404) ou outro erro já exibido pelo interceptor.
    } finally {
      this.salvando.set(false);
    }
  }
}

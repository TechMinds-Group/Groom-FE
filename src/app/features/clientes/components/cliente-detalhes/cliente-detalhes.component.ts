import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TmToastService, TmModalComponent } from '@techminds-group/tm-angular-lib';
import { ClientesService } from '../../../../core/services/clientes.service';
import { AgendamentosService } from '../../../../core/services/agendamentos.service';
import { Cliente } from '../../../../core/models/clientes/cliente.model';
import { Agendamento } from '../../../../core/models/agenda.model';
import { StatusClienteBadgePipe } from '../../pipes/status-cliente-badge.pipe';
import { ClientesHelperService } from '../../services/clientes-helper.service';
import { ClienteModalExcluirComponent } from '../modais/cliente-modal-excluir/cliente-modal-excluir.component';

@Component({
  selector: 'app-cliente-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    StatusClienteBadgePipe,
    ClienteModalExcluirComponent,
    TmModalComponent,
  ],
  templateUrl: './cliente-detalhes.component.html',
  styleUrl: './cliente-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientesHelperService],
})
export class ClienteDetalhesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly clientesService = inject(ClientesService);
  private readonly agendamentosService = inject(AgendamentosService);
  protected readonly helper = inject(ClientesHelperService);
  private readonly toastService = inject(TmToastService);

  protected readonly cliente = signal<Cliente | null>(null);
  protected readonly agendamentosCliente = signal<Agendamento[]>([]);
  protected readonly showDeleteConfirmModal = signal<boolean>(false);
  protected readonly showConfirmarAgendamentosFuturosModal = signal<boolean>(false);
  protected readonly mensagemConfirmacaoFuturos = signal<string>('');
  protected readonly mensagemErroExclusao = signal<string | null>(null);


  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregarDados(id);
    }
  }

  voltar(): void {
    this.router.navigate(['/gestao/clientes']);
  }

  abrirEdicao(): void {
    const c = this.cliente();
    if (c) {
      this.router.navigate(['/gestao/clientes', c.id, 'editar']);
    }
  }

  async salvarEdicao(): Promise<void> {
    // edição agora é feita na tela /gestao/clientes/:id/editar
  }

  excluir(): void {
    this.mensagemErroExclusao.set(null);
    this.showDeleteConfirmModal.set(true);
  }

  async confirmarExcluir(confirmarFuturos = false): Promise<void> {
    const c = this.cliente();
    if (!c) return;

    try {
      await this.clientesService.excluir(c.id, confirmarFuturos);
      this.showDeleteConfirmModal.set(false);
      this.showConfirmarAgendamentosFuturosModal.set(false);
      this.toastService.success('Cliente excluído com sucesso!', 'Sucesso');
      this.voltar();
    } catch (err: unknown) {
      this.showDeleteConfirmModal.set(false);
      if (typeof err === 'object' && err !== null && 'requiresConfirmation' in err) {
        this.mensagemConfirmacaoFuturos.set((err as any).message || '');
        this.showConfirmarAgendamentosFuturosModal.set(true);
        return;
      }
      const mensagem = err instanceof Error ? err.message : 'Não é possível excluir o cliente.';
      this.mensagemErroExclusao.set(mensagem);
      this.toastService.error(mensagem, 'Erro ao Excluir');
    }
  }

  private async carregarDados(id: string): Promise<void> {
    try {
      const dadosCliente = await this.clientesService.carregarClientePorId(id);
      this.cliente.set(dadosCliente);

      await this.agendamentosService.carregarAgendamentos();
      const todosAgendamentos = this.agendamentosService.agendamentos();
      const doCliente = todosAgendamentos.filter(
        (a) => a.clienteId === id || (a.clienteNome && a.clienteNome.toLowerCase() === dadosCliente.nome.toLowerCase())
      );
      this.agendamentosCliente.set(doCliente);
    } catch (err) {
      console.error('Erro ao carregar detalhes do cliente', err);
      this.router.navigate(['/gestao/clientes']);
    }
  }
}

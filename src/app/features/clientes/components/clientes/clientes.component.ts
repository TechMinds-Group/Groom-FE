import { ChangeDetectionStrategy, Component, signal, ViewChild, TemplateRef, AfterViewInit, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmTableComponent, TableColumn } from '@techminds-group/tm-angular-lib';
import { ClientesService, ClientePayload } from '../../../../core/services/clientes.service';
import { Cliente } from '../../../../core/models/clientes/cliente.model';
import { StatusClienteBadgePipe } from '../../pipes/status-cliente-badge.pipe';
import { ClientesHelperService } from '../../services/clientes-helper.service';
import { ClienteModalEditarComponent, ClienteEdicaoPayload } from '../modais/cliente-modal-editar/cliente-modal-editar.component';
import { ClienteModalExcluirComponent } from '../modais/cliente-modal-excluir/cliente-modal-excluir.component';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
    StatusClienteBadgePipe,
    ClienteModalEditarComponent,
    ClienteModalExcluirComponent,
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientesHelperService],
})
export class ClientesComponent implements OnInit, AfterViewInit {
  protected readonly clientesService = inject(ClientesService);
  protected readonly helper = inject(ClientesHelperService);

  protected readonly showFormModal = signal<boolean>(false);
  protected readonly showDeleteModal = signal<boolean>(false);
  protected readonly clienteEmEdicao = signal<Cliente | null>(null);
  protected readonly clienteParaExcluir = signal<Cliente | null>(null);

  ngOnInit(): void {
    this.clientesService.carregarClientes();
  }

  @ViewChild('nomeTemplate', { static: true })
  nomeTemplate!: TemplateRef<{ $implicit: Cliente }>;

  @ViewChild('contatoTemplate', { static: true })
  contatoTemplate!: TemplateRef<{ $implicit: Cliente }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: Cliente }>;

  @ViewChild('acoesTemplate', { static: true })
  acoesTemplate!: TemplateRef<{ $implicit: Cliente }>;

  protected readonly tamanhoPagina = signal<number>(5);
  protected readonly cols = signal<TableColumn<Cliente>[]>([]);

  ngAfterViewInit(): void {
    this.cols.set([
      { header: 'Nome', template: this.nomeTemplate, width: '30%' },
      { header: 'Contato', template: this.contatoTemplate, width: '30%' },
      { header: 'Status', template: this.statusTemplate, width: '20%' },
      { header: 'Ações', template: this.acoesTemplate, width: '20%' },
    ]);
  }

  abrirNovo(): void {
    this.clienteEmEdicao.set(null);
    this.showFormModal.set(true);
  }

  abrirEdicao(cliente: Cliente): void {
    this.clienteEmEdicao.set(cliente);
    this.showFormModal.set(true);
  }

  confirmarExclusao(cliente: Cliente): void {
    this.clienteParaExcluir.set(cliente);
    this.showDeleteModal.set(true);
  }

  async salvar(payload: ClienteEdicaoPayload): Promise<void> {
    try {
      const editando = this.clienteEmEdicao();
      if (editando) {
        await this.clientesService.atualizar(editando.id, payload);
      } else {
        await this.clientesService.adicionar(payload);
      }
      this.showFormModal.set(false);
      this.clienteEmEdicao.set(null);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
    }
  }

  async excluir(): Promise<void> {
    try {
      const c = this.clienteParaExcluir();
      if (c) {
        await this.clientesService.excluir(c.id);
      }
      this.showDeleteModal.set(false);
      this.clienteParaExcluir.set(null);
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
    }
  }
}
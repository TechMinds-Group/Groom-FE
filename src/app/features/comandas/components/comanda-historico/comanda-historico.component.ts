import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableColumn, TmTableComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { firstValueFrom } from 'rxjs';
import { ComandaService } from '../../../../core/services/comanda.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { Cliente } from '../../../../core/models/clientes/cliente.model';
import { Comanda } from '../../../../core/models/comanda/comanda.model';
import {
  STATUS_COMANDA_BADGE,
  ComandaStatusBadgeConfig,
} from '../../models/comanda-status-config.model';

@Component({
  selector: 'app-comanda-historico',
  standalone: true,
  imports: [CommonModule, FormsModule, TmTableComponent, CurrencyPipe, DatePipe],
  templateUrl: './comanda-historico.component.html',
  styleUrls: ['./comanda-historico.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComandaHistoricoComponent implements OnInit, AfterViewInit {
  private readonly comandaService = inject(ComandaService);
  private readonly clientesService = inject(ClientesService);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);

  readonly statusBadge = STATUS_COMANDA_BADGE;

  readonly filtroClienteId = signal('');
  readonly filtroProfissionalId = signal('');
  readonly filtroDataInicio = signal('');
  readonly filtroDataFim = signal('');
  protected readonly carregando = signal(true);
  protected readonly tamanhoPagina = signal<number>(10);

  private readonly _comandas = signal<Comanda[]>([]);
  readonly comandas = this._comandas.asReadonly();

  private readonly _clientes = signal<Cliente[]>([]);
  protected readonly clientes = this._clientes.asReadonly();

  /** Profissionais (padrão agenda: perfil Profissional, nome + sobrenome). */
  protected readonly profissionalOptions = computed(() =>
    this.gestaoUsuariosService
      .usuarios()
      .filter((u) => u.perfil === 'Profissional' || (u.perfil && u.perfil.includes('Profissional')))
      .map((u) => ({ value: u.id, label: u.sobrenome ? `${u.nome} ${u.sobrenome}` : u.nome })),
  );

  @ViewChild('numeroTemplate', { static: true })
  numeroTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('clienteTemplate', { static: true })
  clienteTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('valorTemplate', { static: true })
  valorTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('fechamentoTemplate', { static: true })
  fechamentoTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('acoesTemplate', { static: true })
  acoesTemplate!: TemplateRef<{ $implicit: Comanda }>;

  private readonly templatesReady = signal(false);

  protected readonly cols = computed<TableColumn<Comanda>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Número', template: this.numeroTemplate, width: '10%' },
      { header: 'Cliente', template: this.clienteTemplate, width: '25%' },
      { header: 'Status', template: this.statusTemplate, width: '13%' },
      { header: 'Valor Final', template: this.valorTemplate, width: '16%' },
      { header: 'Data de Fechamento', template: this.fechamentoTemplate, width: '20%' },
      { header: 'Ações', template: this.acoesTemplate, width: '16%' },
    ];
  });

  async ngOnInit(): Promise<void> {
    this.carregando.set(true);
    try {
      await Promise.all([
        this.clientesService.carregarClientes(),
        this.gestaoUsuariosService.carregarUsuarios(),
      ]);
      this._clientes.set(this.clientesService.clientes());
      await this.carregar();
    } catch {
      this.toastService.error('Erro ao carregar os filtros do histórico.');
      this.carregando.set(false);
    }
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const data = await firstValueFrom(
        this.comandaService.getHistorico({
          clienteId: this.filtroClienteId() || undefined,
          profissionalId: this.filtroProfissionalId() || undefined,
          dataInicio: this.filtroDataInicio() || undefined,
          dataFim: this.filtroDataFim() || undefined,
        }),
      );
      this._comandas.set(data);
    } catch {
      this.toastService.error('Erro ao carregar o histórico de comandas.');
    } finally {
      this.carregando.set(false);
    }
  }

  limparFiltros(): void {
    this.filtroClienteId.set('');
    this.filtroProfissionalId.set('');
    this.filtroDataInicio.set('');
    this.filtroDataFim.set('');
    void this.carregar();
  }

  protected statusConfig(comanda: Comanda): ComandaStatusBadgeConfig {
    return STATUS_COMANDA_BADGE[comanda.status];
  }

  /** Canceladas têm `fechadaEmUtc` null — exibe a data de cancelamento. */
  dataFechamento(comanda: Comanda): string | null {
    return comanda.fechadaEmUtc ?? comanda.canceladaEmUtc ?? null;
  }

  protected verDetalhes(comanda: Comanda): void {
    this.router.navigate(['/gestao/comandas', comanda.id]);
  }

  protected voltar(): void {
    this.router.navigate(['/gestao/comandas']);
  }
}

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
import { firstValueFrom } from 'rxjs';
import { TableColumn, TmTableComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { ComandaService } from '../../../../core/services/comanda.service';
import { Comanda, ComandaStatus } from '../../../../core/models/comanda/comanda.model';
import {
  FILTROS_STATUS_COMANDA,
  FiltroStatusComanda,
  STATUS_COMANDA_BADGE,
  ComandaStatusBadgeConfig,
} from '../../models/comanda-status-config.model';

@Component({
  selector: 'app-comandas',
  standalone: true,
  imports: [CommonModule, FormsModule, TmTableComponent, CurrencyPipe, DatePipe],
  templateUrl: './comandas.component.html',
  styleUrls: ['./comandas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComandasComponent implements OnInit, AfterViewInit {
  private readonly comandaService = inject(ComandaService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);

  protected readonly filtrosStatus = FILTROS_STATUS_COMANDA;
  protected readonly statusBadge = STATUS_COMANDA_BADGE;

  readonly filtroSelecionado = signal<FiltroStatusComanda>('');
  readonly carregando = signal(true);
  protected readonly tamanhoPagina = signal<number>(10);

  private readonly _comandas = signal<Comanda[]>([]);
  readonly comandas = this._comandas.asReadonly();

  @ViewChild('numeroTemplate', { static: true })
  numeroTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('clienteTemplate', { static: true })
  clienteTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('itensTemplate', { static: true })
  itensTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('valorTemplate', { static: true })
  valorTemplate!: TemplateRef<{ $implicit: Comanda }>;

  @ViewChild('aberturaTemplate', { static: true })
  aberturaTemplate!: TemplateRef<{ $implicit: Comanda }>;

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
      { header: 'Itens', template: this.itensTemplate, width: '10%' },
      { header: 'Valor Total', template: this.valorTemplate, width: '14%' },
      { header: 'Data de Abertura', template: this.aberturaTemplate, width: '16%' },
      { header: 'Ações', template: this.acoesTemplate, width: '12%' },
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const filtro = this.filtroSelecionado();
      const data = await firstValueFrom(
        this.comandaService.getComandas((filtro || undefined) as ComandaStatus | undefined),
      );
      this._comandas.set(data);
    } catch {
      this.toastService.error('Erro ao carregar as comandas.');
    } finally {
      this.carregando.set(false);
    }
  }

  selecionarFiltro(filtro: FiltroStatusComanda): void {
    this.filtroSelecionado.set(filtro);
    void this.carregar();
  }

  protected statusConfig(comanda: Comanda): ComandaStatusBadgeConfig {
    return STATUS_COMANDA_BADGE[comanda.status];
  }

  verDetalhes(comanda: Comanda): void {
    this.router.navigate(['/gestao/comandas', comanda.id]);
  }

  abrirAvulsa(): void {
    this.router.navigate(['/gestao/comandas/avulsa']);
  }

  abrirHistorico(): void {
    this.router.navigate(['/gestao/comandas/historico']);
  }
}

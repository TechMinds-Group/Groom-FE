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
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableColumn, TmTableComponent } from '@techminds-group/tm-angular-lib';
import { ClientesService } from '../../../../core/services/clientes.service';
import { Cliente } from '../../../../core/models/clientes/cliente.model';
import { StatusClienteBadgePipe } from '../../pipes/status-cliente-badge.pipe';
import { ClientesHelperService } from '../../services/clientes-helper.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
    StatusClienteBadgePipe,
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientesHelperService],
})
export class ClientesComponent implements OnInit, AfterViewInit {
  protected readonly clientesService = inject(ClientesService);
  protected readonly helper = inject(ClientesHelperService);
  private readonly router = inject(Router);

  @ViewChild('clienteTemplate', { static: true })
  clienteTemplate!: TemplateRef<{ $implicit: Cliente }>;

  @ViewChild('celularTemplate', { static: true })
  celularTemplate!: TemplateRef<{ $implicit: Cliente }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: Cliente }>;

  private readonly templatesReady = signal(false);
  protected readonly tamanhoPagina = signal<number>(5);

  protected readonly cols = computed<TableColumn<Cliente>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Cliente', template: this.clienteTemplate, width: '40%' },
      { header: 'Celular', template: this.celularTemplate, width: '35%' },
      { header: 'Status', template: this.statusTemplate, width: '25%' },
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.clientesService.carregarClientes();
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  verDetalhes(item: Cliente): void {
    this.router.navigate(['/gestao/clientes', item.id]);
  }

  abrirNovo(): void {
    this.router.navigate(['/gestao/clientes/novo']);
  }
}
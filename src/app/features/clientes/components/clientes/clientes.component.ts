import { ChangeDetectionStrategy, Component, signal, ViewChild, TemplateRef, AfterViewInit, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TmTableComponent, TableColumn } from '@techminds-group/tm-angular-lib';
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

  ngOnInit(): void {
    this.clientesService.carregarClientes();
  }

  @ViewChild('clienteTemplate', { static: true })
  clienteTemplate!: TemplateRef<{ $implicit: Cliente }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: Cliente }>;

  protected readonly tamanhoPagina = signal<number>(5);
  protected readonly cols = signal<TableColumn<Cliente>[]>([]);

  ngAfterViewInit(): void {
    this.cols.set([
      { header: 'Cliente', template: this.clienteTemplate, width: '65%' },
      { header: 'Status', template: this.statusTemplate, width: '35%' },
    ]);
  }

  verDetalhes(item: Cliente): void {
    this.router.navigate(['/gestao/clientes', item.id]);
  }

  abrirNovo(): void {
    this.router.navigate(['/gestao/clientes/novo']);
  }
}
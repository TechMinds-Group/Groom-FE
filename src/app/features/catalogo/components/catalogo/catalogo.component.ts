import { ChangeDetectionStrategy, Component, OnInit, inject, signal, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  TmTableComponent,
  TableColumn,
} from '@techminds-group/tm-angular-lib';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { ServicoCatalogo } from '../../../../core/models/catalogo/servico.model';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
  ],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  protected readonly catalogoService = inject(CatalogoService);

  @ViewChild('servicoTemplate', { static: true }) servicoTemplate!: TemplateRef<{ $implicit: ServicoCatalogo }>;
  @ViewChild('precoTemplate', { static: true }) precoTemplate!: TemplateRef<{ $implicit: ServicoCatalogo }>;
  @ViewChild('duracaoTemplate', { static: true }) duracaoTemplate!: TemplateRef<{ $implicit: ServicoCatalogo }>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<{ $implicit: ServicoCatalogo }>;

  protected readonly cols = signal<TableColumn<ServicoCatalogo>[]>([]);
  protected readonly tamanhoPagina = signal<number>(5);

  ngAfterViewInit(): void {
    this.cols.set([
      { header: 'Serviço', template: this.servicoTemplate, width: '40%' },
      { header: 'Preço', template: this.precoTemplate, width: '25%' },
      { header: 'Duração', template: this.duracaoTemplate, width: '20%' },
      { header: 'Status', template: this.statusTemplate, width: '15%' },
    ]);
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.catalogoService.carregarServicos();
    } catch {
      console.warn('Catálogo: backend indisponível');
    }
  }

  abrirNovo(): void {
    this.router.navigate(['/servicos/catalogo/novo']);
  }

  verDetalhes(servico: ServicoCatalogo): void {
    this.router.navigate(['/servicos/catalogo', servico.id]);
  }
}
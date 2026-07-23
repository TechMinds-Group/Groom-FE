import { ChangeDetectionStrategy, Component, signal, ViewChild, TemplateRef, AfterViewInit, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TmTableComponent, TableColumn, TmSelectOption } from '@techminds-group/tm-angular-lib';
import { AssinantesService, ClienteAssinante } from '../../../../core/services/assinantes.service';
import { ClubesService } from '../../../../core/services/clubes.service';
import { StatusAssinanteBadgePipe } from '../../pipes/status-assinante.pipe';
import { AssinantesEstabelecimentoHelperService } from '../../services/assinantes-estabelecimento-helper.service';
import { AssinanteModalEditarComponent, AssinanteEdicaoPayload } from '../modais/assinante-modal-editar/assinante-modal-editar.component';

@Component({
  selector: 'app-assinantes-estabelecimento',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
    StatusAssinanteBadgePipe,
    AssinanteModalEditarComponent,
  ],
  templateUrl: './assinantes-estabelecimento.component.html',
  styleUrl: './assinantes-estabelecimento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AssinantesEstabelecimentoHelperService],
})
export class AssinantesEstabelecimentoComponent implements OnInit, AfterViewInit {
  protected readonly assinantesService = inject(AssinantesService);
  protected readonly clubesService = inject(ClubesService);
  protected readonly helper = inject(AssinantesEstabelecimentoHelperService);
  private readonly router = inject(Router);

  protected readonly showFormModal = signal<boolean>(false);

  protected readonly clubeOptions = computed<TmSelectOption[]>(() => {
    return this.clubesService.clubes()
      .filter((c) => c.status === 'Ativo')
      .map((clube) => ({
        value: clube.id,
        label: `${clube.nome} (R$ ${clube.preco.toFixed(2).replace('.', ',')})`,
      }));
  });

  ngOnInit(): void {
    this.assinantesService.carregarAssinantes();
    this.clubesService.carregarClubes().subscribe();
  }

  @ViewChild('clienteTemplate', { static: true })
  clienteTemplate!: TemplateRef<{ $implicit: ClienteAssinante }>;

  @ViewChild('planoTemplate', { static: true })
  planoTemplate!: TemplateRef<{ $implicit: ClienteAssinante }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: ClienteAssinante }>;

  protected readonly tamanhoPagina = signal<number>(5);
  protected readonly cols = signal<TableColumn<ClienteAssinante>[]>([]);

  ngAfterViewInit(): void {
    this.cols.set([
      { header: 'Cliente', template: this.clienteTemplate, width: '40%' },
      { header: 'Plano', template: this.planoTemplate, width: '35%' },
      { header: 'Status', template: this.statusTemplate, width: '25%' },
    ]);
  }

  verDetalhes(item: ClienteAssinante): void {
    this.router.navigate(['/gestao/assinantes', item.id]);
  }

  abrirNovo(): void {
    this.showFormModal.set(true);
  }

  async salvar(payload: AssinanteEdicaoPayload): Promise<void> {
    try {
      await this.assinantesService.adicionar(payload);
      this.showFormModal.set(false);
    } catch (err) {
      console.error('Erro ao adicionar assinante:', err);
    }
  }
}

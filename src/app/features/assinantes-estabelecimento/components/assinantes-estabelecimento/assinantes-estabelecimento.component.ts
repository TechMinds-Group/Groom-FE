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
import { AssinantesService, ClienteAssinante } from '../../../../core/services/assinantes.service';
import { StatusAssinanteBadgePipe } from '../../pipes/status-assinante.pipe';
import { AssinantesEstabelecimentoHelperService } from '../../services/assinantes-estabelecimento-helper.service';

@Component({
  selector: 'app-assinantes-estabelecimento',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
    StatusAssinanteBadgePipe,
  ],
  templateUrl: './assinantes-estabelecimento.component.html',
  styleUrl: './assinantes-estabelecimento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AssinantesEstabelecimentoHelperService],
})
export class AssinantesEstabelecimentoComponent implements OnInit, AfterViewInit {
  protected readonly assinantesService = inject(AssinantesService);
  protected readonly helper = inject(AssinantesEstabelecimentoHelperService);
  private readonly router = inject(Router);

  @ViewChild('clienteTemplate', { static: true })
  clienteTemplate!: TemplateRef<{ $implicit: ClienteAssinante }>;

  @ViewChild('celularTemplate', { static: true })
  celularTemplate!: TemplateRef<{ $implicit: ClienteAssinante }>;

  @ViewChild('planoTemplate', { static: true })
  planoTemplate!: TemplateRef<{ $implicit: ClienteAssinante }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: ClienteAssinante }>;

  private readonly templatesReady = signal(false);
  protected readonly tamanhoPagina = signal<number>(5);

  protected readonly cols = computed<TableColumn<ClienteAssinante>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Assinante', template: this.clienteTemplate, width: '35%' },
      { header: 'Celular', template: this.celularTemplate, width: '30%' },
      { header: 'Plano', template: this.planoTemplate, width: '20%' },
      { header: 'Status', template: this.statusTemplate, width: '15%' },
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.clientesServiceOrAssinantes();
  }

  private async clientesServiceOrAssinantes(): Promise<void> {
    await this.assinantesService.carregarAssinantes();
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  verDetalhes(item: ClienteAssinante): void {
    this.router.navigate(['/gestao/assinantes', item.id]);
  }

  abrirNovo(): void {
    this.router.navigate(['/gestao/assinantes/novo']);
  }

  protected obterLinkWhatsapp(celular?: string): string {
    if (!celular) return '#';
    const num = celular.replace(/\D/g, '');
    const comDdi = num.startsWith('55') ? num : `55${num}`;
    return `https://wa.me/${comDdi}`;
  }
}

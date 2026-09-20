import {
  AfterViewInit,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TableColumn,
  TmSelectComponent,
  TmTableComponent,
  TmTextComponent,
} from '@techminds-group/tm-angular-lib';
import { NotificacaoService } from '../../../../core/services/notificacao.service';
import { NotificacaoItem, TipoNotificacao } from '../../../../core/models/notificacao/notificacao.model';
import { ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-notificacoes-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, TmTableComponent, TmTextComponent, TmSelectComponent],
  templateUrl: './notificacoes-lista.component.html',
  styleUrls: ['./notificacoes-lista.component.scss'],
})
export class NotificacoesListaComponent implements OnInit, AfterViewInit {
  protected readonly notificacaoService = inject(NotificacaoService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  @ViewChild('selecaoTemplate', { static: true })
  selecaoTemplate!: TemplateRef<{ $implicit: NotificacaoItem }>;

  @ViewChild('tipoTemplate', { static: true })
  tipoTemplate!: TemplateRef<{ $implicit: NotificacaoItem }>;

  @ViewChild('tituloMensagemTemplate', { static: true })
  tituloMensagemTemplate!: TemplateRef<{ $implicit: NotificacaoItem }>;

  @ViewChild('dataHoraTemplate', { static: true })
  dataHoraTemplate!: TemplateRef<{ $implicit: NotificacaoItem }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: NotificacaoItem }>;

  @ViewChild('acoesTemplate', { static: true })
  acoesTemplate!: TemplateRef<{ $implicit: NotificacaoItem }>;

  protected readonly templatesReady = signal(false);

  readonly termoBusca = signal<string>('');
  readonly tipoFiltro = signal<string>('Todos');
  readonly statusFiltro = signal<string>('Todos'); // 'Todos' | 'NaoLidas' | 'Lidas'
  readonly periodoDias = signal<number>(90);
  readonly idsSelecionados = signal<string[]>([]);
  readonly tamanhoPagina = signal<number>(10);

  readonly notificacoes = this.notificacaoService.notificacoes;

  readonly tipoOptions = signal<{ value: string; label: string }[]>([
    { value: 'Todos', label: 'Todos os Tipos' },
    { value: 'EstoqueBaixo', label: 'Estoque Baixo' },
    { value: 'ValidadeProxima', label: 'Validade Próxima' },
    { value: 'AgendamentoCriado', label: 'Novo Agendamento' },
    { value: 'AgendamentoPendente', label: 'Confirmação Pendente' },
    { value: 'ClienteNoShow', label: 'Falta (No-Show)' },
    { value: 'AssinaturaVencendo', label: 'Assinatura Vencendo' },
    { value: 'Geral', label: 'Geral' },
  ]);

  readonly statusOptions = signal<{ value: string; label: string }[]>([
    { value: 'Todos', label: 'Todas' },
    { value: 'NaoLidas', label: 'Apenas Não Lidas' },
    { value: 'Lidas', label: 'Apenas Lidas' },
  ]);

  readonly notificacoesFiltradas = computed(() => {
    let lista = this.notificacoes();
    const termo = this.termoBusca().toLowerCase().trim();
    const tipo = this.tipoFiltro();
    const status = this.statusFiltro();

    if (termo) {
      lista = lista.filter(n => n.titulo.toLowerCase().includes(termo) || n.mensagem.toLowerCase().includes(termo));
    }

    if (tipo !== 'Todos') {
      lista = lista.filter(n => n.tipo === tipo);
    }

    if (status === 'NaoLidas') {
      lista = lista.filter(n => !n.lida);
    } else if (status === 'Lidas') {
      lista = lista.filter(n => n.lida);
    }

    return lista;
  });

  readonly totalNaoLidas = computed(() => this.notificacoes().filter(n => !n.lida).length);
  readonly totalEstoqueAlertas = computed(() => this.notificacoes().filter(n => n.tipo === 'EstoqueBaixo' || n.tipo === 'ValidadeProxima').length);
  readonly totalAgendamentos = computed(() => this.notificacoes().filter(n => n.tipo === 'AgendamentoCriado' || n.tipo === 'AgendamentoPendente' || n.tipo === 'ClienteNoShow').length);

  protected readonly cols = computed<TableColumn<NotificacaoItem>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: '', template: this.selecaoTemplate, width: '40px', sortable: false },
      { header: 'Tipo', template: this.tipoTemplate, width: '170px', sortable: true, key: 'tipo' },
      { header: 'Título & Mensagem', template: this.tituloMensagemTemplate, width: '40%', sortable: true, key: 'titulo' },
      { header: 'Data / Hora', template: this.dataHoraTemplate, width: '160px', sortable: true, key: 'createdAtUtc' },
      { header: 'Status', template: this.statusTemplate, width: '100px', sortable: true, key: 'lida' },
      { header: 'Ações', template: this.acoesTemplate, width: '120px', sortable: false },
    ];
  });

  ngOnInit(): void {
    this.carregar();
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  carregar(): void {
    const apenasNaoLidas = this.statusFiltro() === 'NaoLidas' ? true : (this.statusFiltro() === 'Lidas' ? false : undefined);
    this.notificacaoService.carregarNotificacoesComFiltro(
      this.termoBusca(),
      this.tipoFiltro(),
      apenasNaoLidas,
      this.periodoDias()
    ).subscribe();
  }

  onBuscaChange(val: string | number | null): void {
    this.termoBusca.set(val ? String(val) : '');
    this.carregar();
  }

  onTipoSelectChange(val: unknown): void {
    this.tipoFiltro.set(typeof val === 'string' ? val : 'Todos');
    this.carregar();
  }

  onStatusSelectChange(val: unknown): void {
    this.statusFiltro.set(typeof val === 'string' ? val : 'Todos');
    this.carregar();
  }

  toggleSelecaoTodos(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.idsSelecionados.set(this.notificacoesFiltradas().map(n => n.id));
    } else {
      this.idsSelecionados.set([]);
    }
  }

  toggleSelecaoItem(id: string): void {
    this.idsSelecionados.update(lista =>
      lista.includes(id) ? lista.filter(i => i !== id) : [...lista, id]
    );
  }

  marcarSelecionadasComoLidas(): void {
    const ids = this.idsSelecionados();
    if (ids.length === 0) return;
    this.notificacaoService.marcarLidasEmLote(ids).subscribe(() => {
      this.idsSelecionados.set([]);
    });
  }

  marcarTodasComoLidas(): void {
    this.notificacaoService.marcarTodasComoLidas().subscribe();
  }

  marcarComoLida(item: NotificacaoItem, event: MouseEvent): void {
    event.stopPropagation();
    if (!item.lida) {
      this.notificacaoService.marcarComoLida(item.id).subscribe();
    }
  }

  remover(item: NotificacaoItem, event: MouseEvent): void {
    event.stopPropagation();
    this.notificacaoService.removerNotificacao(item.id).subscribe();
  }

  clicarNotificacao(item: NotificacaoItem): void {
    if (!item.lida) {
      this.notificacaoService.marcarComoLida(item.id).subscribe();
    }
    if (item.linkRedirecionamento) {
      this.router.navigateByUrl(item.linkRedirecionamento);
    }
  }

  obterInfoTipo(tipo: TipoNotificacao): { label: string; class: string; icon: string } {
    switch (tipo) {
      case 'EstoqueBaixo':
        return { label: 'Estoque Baixo', class: 'bg-danger-subtle text-danger border-danger-subtle', icon: 'fas fa-exclamation-triangle' };
      case 'ValidadeProxima':
        return { label: 'Validade Próxima', class: 'bg-warning-subtle text-warning border-warning-subtle', icon: 'fas fa-calendar-alt' };
      case 'AgendamentoCriado':
        return { label: 'Novo Agendamento', class: 'bg-success-subtle text-success border-success-subtle', icon: 'fas fa-calendar-check' };
      case 'AgendamentoPendente':
        return { label: 'Confirmação Pendente', class: 'bg-warning-subtle text-warning border-warning-subtle', icon: 'fas fa-clock' };
      case 'ClienteNoShow':
        return { label: 'Falta (No-Show)', class: 'bg-danger-subtle text-danger border-danger-subtle', icon: 'fas fa-user-slash' };
      case 'AssinaturaVencendo':
        return { label: 'Assinatura Vencendo', class: 'bg-purple-subtle text-purple border-purple-subtle', icon: 'fas fa-credit-card' };
      default:
        return { label: 'Geral', class: 'bg-primary-subtle text-primary border-primary-subtle', icon: 'fas fa-info-circle' };
    }
  }
}

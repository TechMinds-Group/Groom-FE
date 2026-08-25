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
import { FormsModule } from '@angular/forms';
import { TableColumn, TmTableComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';

import { LogsService } from '../../../../core/services/logs.service';

export interface LogItem {
  id: string;
  dataHora: string;
  usuario: string;
  modulo: string;
  acao: string;
  detalhes: string;
  ip: string;
  status: 'Sucesso' | 'Alerta' | 'Erro';
}

@Component({
  selector: 'app-logs-sistema',
  standalone: true,
  imports: [CommonModule, FormsModule, TmTableComponent, TmTextComponent],
  templateUrl: './logs-sistema.component.html',
  styleUrl: './logs-sistema.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsSistemaComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly logsService = inject(LogsService);

  @ViewChild('dataHoraTemplate', { static: true })
  dataHoraTemplate!: TemplateRef<{ $implicit: LogItem }>;

  @ViewChild('usuarioTemplate', { static: true })
  usuarioTemplate!: TemplateRef<{ $implicit: LogItem }>;

  @ViewChild('moduloTemplate', { static: true })
  moduloTemplate!: TemplateRef<{ $implicit: LogItem }>;

  @ViewChild('detalhesTemplate', { static: true })
  detalhesTemplate!: TemplateRef<{ $implicit: LogItem }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: LogItem }>;

  private readonly templatesReady = signal(false);
  protected readonly carregando = signal(false);
  protected readonly tamanhoPagina = signal<number>(10);
  protected readonly termoBusca = signal<string>('');
  protected readonly moduloFiltro = signal<string>('todos');

  protected readonly logs = this.logsService.logs;

  protected readonly logsFiltrados = computed<LogItem[]>(() => {
    const busca = this.termoBusca().toLowerCase().trim();
    const modulo = this.moduloFiltro();

    return this.logs().filter((item) => {
      const matchModulo = modulo === 'todos' || item.modulo.toLowerCase() === modulo.toLowerCase();
      const matchBusca =
        !busca ||
        item.usuario.toLowerCase().includes(busca) ||
        item.acao.toLowerCase().includes(busca) ||
        item.detalhes.toLowerCase().includes(busca) ||
        item.modulo.toLowerCase().includes(busca);

      return matchModulo && matchBusca;
    });
  });

  protected readonly cols = computed<TableColumn<LogItem>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Data/Hora', template: this.dataHoraTemplate, width: '18%' },
      { header: 'Usuário', template: this.usuarioTemplate, width: '20%' },
      { header: 'Módulo', template: this.moduloTemplate, width: '14%' },
      { header: 'Ação / Detalhes', template: this.detalhesTemplate, width: '36%' },
      { header: 'Status', template: this.statusTemplate, width: '12%' },
    ];
  });

  async ngOnInit(): Promise<void> {
    this.carregando.set(true);
    try {
      await this.logsService.carregarLogs();
    } finally {
      this.carregando.set(false);
    }
  }

  async onModuloChange(val: string): Promise<void> {
    this.moduloFiltro.set(val);
    this.carregando.set(true);
    try {
      await this.logsService.carregarLogs(val, this.termoBusca());
    } finally {
      this.carregando.set(false);
    }
  }

  async atualizarBusca(val: string | number | null): Promise<void> {
    const termo = val ? String(val) : '';
    this.termoBusca.set(termo);
    await this.logsService.carregarLogs(this.moduloFiltro(), termo);
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  voltar(): void {
    this.router.navigate(['/configuracoes']);
  }
}

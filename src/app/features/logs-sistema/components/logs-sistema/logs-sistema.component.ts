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

  @ViewChild('dataHoraTemplate', { static: true })
  dataHoraTemplate!: TemplateRef<{ $implicit: LogItem }>;

  @ViewChild('usuarioTemplate', { static: true })
  usuarioTemplate!: TemplateRef<{ $implicit: LogItem }>;

  @ViewChild('moduloTemplate', { static: true })
  moduloTemplate!: TemplateRef<{ $implicit: LogItem }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: LogItem }>;

  private readonly templatesReady = signal(false);
  protected readonly tamanhoPagina = signal<number>(10);
  protected readonly termoBusca = signal<string>('');
  protected readonly moduloFiltro = signal<string>('todos');

  protected readonly logs = signal<LogItem[]>([
    {
      id: '1',
      dataHora: new Date().toISOString(),
      usuario: 'Administrador Sistema',
      modulo: 'Usuários',
      acao: 'Edição de Usuário',
      detalhes: 'Alterou nível de acesso e dados cadastrais',
      ip: '192.168.1.10',
      status: 'Sucesso',
    },
    {
      id: '2',
      dataHora: new Date(Date.now() - 3600000 * 2).toISOString(),
      usuario: 'Administrador Sistema',
      modulo: 'Assinantes',
      acao: 'Atualização de Status',
      detalhes: 'Alterou status da assinatura para Ativo',
      ip: '192.168.1.10',
      status: 'Sucesso',
    },
    {
      id: '3',
      dataHora: new Date(Date.now() - 3600000 * 5).toISOString(),
      usuario: 'Carlos Silva',
      modulo: 'Agenda',
      acao: 'Confirmação de Agendamento',
      detalhes: 'Confirmou agendamento #AGD-1092',
      ip: '187.54.12.33',
      status: 'Sucesso',
    },
    {
      id: '4',
      dataHora: new Date(Date.now() - 3600000 * 12).toISOString(),
      usuario: 'WhatsApp Automação',
      modulo: 'WhatsApp',
      acao: 'Envio de Lembrete',
      detalhes: 'Lembrete de 1 dia enviado via Evolution API',
      ip: '10.0.0.5',
      status: 'Sucesso',
    },
    {
      id: '5',
      dataHora: new Date(Date.now() - 3600000 * 24).toISOString(),
      usuario: 'Sistema',
      modulo: 'Autenticação',
      acao: 'Tentativa de Login Inválida',
      detalhes: 'Senha incorreta para usuário admin@groom.com',
      ip: '200.189.44.12',
      status: 'Alerta',
    },
  ]);

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
      { header: 'Data/Hora', template: this.dataHoraTemplate, width: '20%' },
      { header: 'Usuário', template: this.usuarioTemplate, width: '25%' },
      { header: 'Módulo', template: this.moduloTemplate, width: '15%' },
      { header: 'Ação / Detalhes', key: 'acao', width: '25%' },
      { header: 'Status', template: this.statusTemplate, width: '15%' },
    ];
  });

  protected atualizarBusca(val: string | number | null): void {
    this.termoBusca.set(val ? String(val) : '');
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  voltar(): void {
    this.router.navigate(['/configuracoes']);
  }
}

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableColumn, TmTableComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { ListaEsperaService } from '../../../../core/services/lista-espera.service';
import { AdicionarListaEsperaPayload, ListaEsperaItem } from '../../../../core/models/lista-espera/lista-espera.model';
import { ModalAdicionarEntradaComponent } from '../modais/modal-adicionar-entrada/modal-adicionar-entrada.component';
import { StatusListaEsperaPipe } from '../../pipes/status-lista-espera.pipe';
import { ListaEsperaHelperService } from '../../services/lista-espera-helper.service';

/** Data de hoje no fuso do navegador (UTC-3 — DEC-002) como "YYYY-MM-DD". */
function hojeIso(): string {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

/**
 * Painel da lista de espera do dia (RN-077 — UI_SPEC §5.15): tabela FIFO com
 * posição, preferências, status e badge de reserva ativa com contagem
 * regressiva; filtro de data (default hoje). Sem edição de posição — a ordem é
 * FIFO por entrada.
 */
@Component({
  selector: 'app-lista-espera',
  standalone: true,
  imports: [CommonModule, FormsModule, TmTableComponent, ModalAdicionarEntradaComponent, StatusListaEsperaPipe],
  templateUrl: './lista-espera.component.html',
  styleUrl: './lista-espera.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ListaEsperaHelperService],
})
export class ListaEsperaComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly listaEsperaService = inject(ListaEsperaService);
  private readonly toastService = inject(TmToastService);
  protected readonly helper = inject(ListaEsperaHelperService);

  @ViewChild('posicaoTemplate', { static: true })
  posicaoTemplate!: TemplateRef<{ $implicit: ListaEsperaItem }>;

  @ViewChild('clienteTemplate', { static: true })
  clienteTemplate!: TemplateRef<{ $implicit: ListaEsperaItem }>;

  @ViewChild('servicoTemplate', { static: true })
  servicoTemplate!: TemplateRef<{ $implicit: ListaEsperaItem }>;

  @ViewChild('profissionalTemplate', { static: true })
  profissionalTemplate!: TemplateRef<{ $implicit: ListaEsperaItem }>;

  @ViewChild('janelaTemplate', { static: true })
  janelaTemplate!: TemplateRef<{ $implicit: ListaEsperaItem }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: ListaEsperaItem }>;

  @ViewChild('reservaTemplate', { static: true })
  reservaTemplate!: TemplateRef<{ $implicit: ListaEsperaItem }>;

  @ViewChild('entradaTemplate', { static: true })
  entradaTemplate!: TemplateRef<{ $implicit: ListaEsperaItem }>;

  private readonly templatesReady = signal(false);

  protected readonly tamanhoPagina = signal<number>(10);
  protected readonly dataSelecao = signal<string>(hojeIso());
  protected readonly entradas = signal<ListaEsperaItem[]>([]);
  protected readonly carregando = signal(false);

  /** Tick de 1s que alimenta a contagem regressiva dos badges de reserva. */
  protected readonly agoraMs = signal<number>(Date.now());
  private contagemTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly modalCadastroAberto = signal(false);
  protected readonly cadastrando = signal(false);

  protected readonly colunas = computed<TableColumn<ListaEsperaItem>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: '#', template: this.posicaoTemplate, width: '60px', sortable: true, key: 'posicao' },
      { header: 'Cliente', template: this.clienteTemplate, width: '18%' },
      { header: 'Serviço desejado', template: this.servicoTemplate, width: '14%' },
      { header: 'Profissional preferido', template: this.profissionalTemplate, width: '14%' },
      { header: 'Janela (a partir de)', template: this.janelaTemplate, width: '10%' },
      { header: 'Status', template: this.statusTemplate, width: '10%' },
      { header: 'Reserva ativa', template: this.reservaTemplate, width: '12%' },
      { header: 'Entrada às', template: this.entradaTemplate, width: '9%' },
    ];
  });

  ngOnInit(): void {
    void this.carregar();
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  ngOnDestroy(): void {
    if (this.contagemTimer !== null) {
      clearInterval(this.contagemTimer);
      this.contagemTimer = null;
    }
  }

  /**
   * Tick de 1s apenas enquanto há reserva ativa exibindo contagem — sem timer
   * ocioso quando a lista do dia não tem reservas pendentes.
   */
  private sincronizarContagem(): void {
    const precisa = this.entradas().some((item) => item.reservaAtiva != null);
    if (precisa && this.contagemTimer === null) {
      this.contagemTimer = setInterval(() => this.agoraMs.set(Date.now()), 1000);
    } else if (!precisa && this.contagemTimer !== null) {
      clearInterval(this.contagemTimer);
      this.contagemTimer = null;
    }
  }

  protected async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      this.entradas.set(await this.listaEsperaService.listarDoDia(this.dataSelecao()));
    } catch {
      // Toast exibido pelo errorInterceptor; painel permanece com o último estado.
    } finally {
      this.carregando.set(false);
      this.sincronizarContagem();
    }
  }

  protected onDataChange(valor: string | null): void {
    this.dataSelecao.set(valor || hojeIso());
    void this.carregar();
  }

  /**
   * Adiciona o cliente à lista do dia pela recepção (regra 1 do RN-074); em
   * seguida recarrega a tabela para exibir a posição FIFO atualizada.
   * 409 `ListaEspera.Duplicada`, 404 e 400 → toast do errorInterceptor.
   */
  protected async confirmarCadastro(payload: AdicionarListaEsperaPayload): Promise<void> {
    if (this.cadastrando()) {
      return;
    }
    this.cadastrando.set(true);
    try {
      await this.listaEsperaService.adicionarEntrada(payload);
      this.toastService.success('Cliente adicionado à lista de espera.', 'Lista de Espera');
      this.modalCadastroAberto.set(false);
      await this.carregar();
    } catch {
      // Erros de negócio (409 duplicada / 404 / 400) exibidos pelo errorInterceptor.
    } finally {
      this.cadastrando.set(false);
    }
  }
}

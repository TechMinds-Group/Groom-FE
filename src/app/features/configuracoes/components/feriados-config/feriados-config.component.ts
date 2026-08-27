import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableColumn, TmModalComponent, TmTableComponent, TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import {
  BloqueioAgendaDTO,
  BloqueioAgendaService,
  FeriadoNacionalImportarDTO,
} from '../../../../core/services/bloqueio-agenda.service';

@Component({
  selector: 'app-feriados-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TmTableComponent,
    TmModalComponent,
    TmTextComponent,
  ],
  templateUrl: './feriados-config.component.html',
  styleUrl: './feriados-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeriadosConfigComponent implements OnInit, AfterViewInit {
  private readonly bloqueioService = inject(BloqueioAgendaService);
  private readonly toastService = inject(TmToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('tituloTemplate', { static: true }) tituloTemplate!: TemplateRef<{ $implicit: BloqueioAgendaDTO }>;
  @ViewChild('periodoTemplate', { static: true }) periodoTemplate!: TemplateRef<{ $implicit: BloqueioAgendaDTO }>;
  @ViewChild('escopoTemplate', { static: true }) escopoTemplate!: TemplateRef<{ $implicit: BloqueioAgendaDTO }>;
  @ViewChild('tipoTemplate', { static: true }) tipoTemplate!: TemplateRef<{ $implicit: BloqueioAgendaDTO }>;

  protected readonly templatesReady = signal(false);
  readonly bloqueios = signal<BloqueioAgendaDTO[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly importando = signal(false);

  readonly bloqueioSelecionado = signal<BloqueioAgendaDTO | null>(null);

  readonly anoSelecionado = signal<number>(new Date().getFullYear());
  readonly anos = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  readonly feriadosParaImportar = signal<FeriadoNacionalImportarDTO[]>([]);
  readonly modalImportarAberto = signal(false);
  readonly modalBloqueioAberto = signal(false);
  readonly modalExcluirAberto = signal(false);
  readonly bloqueioParaExcluir = signal<BloqueioAgendaDTO | null>(null);

  readonly tamanhoPagina = signal<number>(10);

  readonly formBloqueio: FormGroup = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(2)]],
    dataInicio: ['', [Validators.required]],
    dataFim: ['', [Validators.required]],
    diaInteiro: [true],
  });

  protected readonly cols = computed<TableColumn<BloqueioAgendaDTO>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Título / Motivo', template: this.tituloTemplate, width: '35%' },
      { header: 'Período', template: this.periodoTemplate, width: '30%' },
      { header: 'Escopo', template: this.escopoTemplate, width: '20%' },
      { header: 'Tipo', template: this.tipoTemplate, width: '15%' },
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.carregar();
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
    this.cdr.markForCheck();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const ano = this.anoSelecionado();
      const inicio = `${ano}-01-01T00:00:00Z`;
      const fim = `${ano}-12-31T23:59:59Z`;
      const dados = await this.bloqueioService.listarBloqueios(inicio, fim);
      this.bloqueios.set(dados);
    } catch {
      this.bloqueios.set([]);
    } finally {
      this.carregando.set(false);
      this.cdr.markForCheck();
    }
  }

  async mudarAno(evento: Event): Promise<void> {
    const ano = parseInt((evento.target as HTMLSelectElement).value, 10);
    if (!isNaN(ano)) {
      this.anoSelecionado.set(ano);
      await this.carregar();
    }
  }

  verDetalhes(item: BloqueioAgendaDTO): void {
    this.bloqueioSelecionado.set(item);
  }

  voltar(): void {
    this.bloqueioSelecionado.set(null);
  }

  // ─── Modal Importar Feriados ──────────────────────────────────────────────

  async abrirImportar(): Promise<void> {
    this.importando.set(true);
    this.modalImportarAberto.set(true);
    this.feriadosParaImportar.set([]);
    try {
      const lista = await this.bloqueioService.obterFeriadosNacionais(this.anoSelecionado());
      this.feriadosParaImportar.set(lista.map((f) => ({ date: f.date, name: f.name, selecionado: true })));
    } catch {
      this.toastService.error('Não foi possível consultar os feriados nacionais. Tente novamente.', 'Erro');
      this.modalImportarAberto.set(false);
    } finally {
      this.importando.set(false);
      this.cdr.markForCheck();
    }
  }

  fecharImportar(): void {
    this.modalImportarAberto.set(false);
  }

  toggleTodos(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.feriadosParaImportar.update((lista) => lista.map((f) => ({ ...f, selecionado: checked })));
  }

  async confirmarImportar(): Promise<void> {
    const selecionados = this.feriadosParaImportar().filter((f) => f.selecionado);
    if (selecionados.length === 0) {
      this.toastService.warning('Selecione ao menos um feriado para importar.', 'Atenção');
      return;
    }
    this.importando.set(true);
    try {
      const res = await this.bloqueioService.importarFeriados({
        ano: this.anoSelecionado(),
        feriados: this.feriadosParaImportar(),
      });
      this.toastService.success(`${res.totalImportados} feriado(s) importado(s) com sucesso!`, 'Sucesso');
      this.fecharImportar();
      await this.carregar();
    } catch {
      this.toastService.error('Erro ao importar os feriados. Tente novamente.', 'Erro');
    } finally {
      this.importando.set(false);
      this.cdr.markForCheck();
    }
  }

  // ─── Modal Novo Bloqueio ──────────────────────────────────────────────────

  abrirBloqueio(): void {
    const hoje = new Date().toISOString().split('T')[0];
    this.formBloqueio.reset({ titulo: '', dataInicio: hoje, dataFim: hoje, diaInteiro: true });
    this.modalBloqueioAberto.set(true);
  }

  fecharBloqueio(): void {
    this.modalBloqueioAberto.set(false);
  }

  async salvarBloqueio(): Promise<void> {
    if (this.formBloqueio.invalid) {
      this.formBloqueio.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    try {
      const v = this.formBloqueio.value;
      await this.bloqueioService.criarBloqueio({
        profissionalId: null,
        titulo: v.titulo!,
        dataInicio: `${v.dataInicio}T00:00:00Z`,
        dataFim: `${v.dataFim}T23:59:59Z`,
        diaInteiro: v.diaInteiro ?? true,
        origem: 'manual',
      });
      this.toastService.success('Bloqueio cadastrado com sucesso!', 'Sucesso');
      this.fecharBloqueio();
      await this.carregar();
    } catch {
      this.toastService.error('Erro ao salvar o bloqueio. Verifique os dados e tente novamente.', 'Erro');
    } finally {
      this.salvando.set(false);
      this.cdr.markForCheck();
    }
  }

  // ─── Modal Excluir Bloqueio (TmModal da lib) ──────────────────────────────

  solicitarExclusao(b: BloqueioAgendaDTO): void {
    this.bloqueioParaExcluir.set(b);
    this.modalExcluirAberto.set(true);
  }

  fecharExcluir(): void {
    this.modalExcluirAberto.set(false);
    this.bloqueioParaExcluir.set(null);
  }

  async confirmarExcluir(): Promise<void> {
    const b = this.bloqueioParaExcluir();
    if (!b) return;
    try {
      await this.bloqueioService.removerBloqueio(b.id);
      this.toastService.success('Bloqueio excluído com sucesso!', 'Sucesso');
      this.fecharExcluir();
      this.voltar();
      await this.carregar();
    } catch {
      this.toastService.error('Erro ao excluir o bloqueio. Tente novamente.', 'Erro');
      this.cdr.markForCheck();
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  formatarData(iso: string): string {
    if (!iso) return '';
    const parts = iso.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(iso).toLocaleDateString('pt-BR');
  }
}

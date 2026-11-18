import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TableColumn, TmTableComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { JornadaEspecialService } from '../../../../core/services/jornada-especial.service';
import {
  CriarJornadaEspecialCommand,
  JornadaEspecial,
} from '../../../../core/models/configuracoes/jornada-especial.model';
import { JornadaFormModalComponent } from '../modais/jornada-form-modal/jornada-form-modal.component';
import { JornadaExcluirModalComponent } from '../modais/jornada-excluir-modal/jornada-excluir-modal.component';
import {
  ESCOPO_ESTABELECIMENTO,
  ESCOPO_TODOS,
  ProfissionalOpcao,
} from '../../models/jornada-especial-config.model';

/**
 * Tela de gestão de Jornadas Especiais do painel (RN-147): listagem das exceções de
 * horário (RN-111) com filtro em memória por escopo (estabelecimento × profissional),
 * formulário de criação/edição e exclusão com confirmação.
 */
@Component({
  selector: 'app-jornada-especial',
  standalone: true,
  imports: [TmTableComponent, JornadaFormModalComponent, JornadaExcluirModalComponent],
  templateUrl: './jornada-especial.component.html',
  styleUrl: './jornada-especial.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JornadaEspecialComponent implements OnInit, AfterViewInit {
  private readonly jornadaService = inject(JornadaEspecialService);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly toastService = inject(TmToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('tituloTemplate', { static: true }) tituloTemplate!: TemplateRef<{ $implicit: JornadaEspecial }>;
  @ViewChild('periodoTemplate', { static: true }) periodoTemplate!: TemplateRef<{ $implicit: JornadaEspecial }>;
  @ViewChild('horarioTemplate', { static: true }) horarioTemplate!: TemplateRef<{ $implicit: JornadaEspecial }>;
  @ViewChild('escopoTemplate', { static: true }) escopoTemplate!: TemplateRef<{ $implicit: JornadaEspecial }>;
  @ViewChild('acoesTemplate', { static: true }) acoesTemplate!: TemplateRef<{ $implicit: JornadaEspecial }>;

  protected readonly templatesReady = signal(false);

  readonly jornadas = signal<JornadaEspecial[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly excluindo = signal(false);

  readonly profissionais = signal<ProfissionalOpcao[]>([]);

  readonly anoSelecionado = signal<number>(new Date().getFullYear());
  readonly anos = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];

  /** Filtro de escopo em memória: 'todos' | 'estabelecimento' | id do profissional. */
  readonly filtroEscopo = signal<string>(ESCOPO_TODOS);

  readonly jornadasFiltradas = computed(() => {
    const escopo = this.filtroEscopo();
    const lista = this.jornadas();
    if (escopo === ESCOPO_TODOS) {
      return lista;
    }
    if (escopo === ESCOPO_ESTABELECIMENTO) {
      return lista.filter((j) => !j.profissionalId);
    }
    return lista.filter((j) => j.profissionalId === escopo);
  });

  readonly jornadaSelecionada = signal<JornadaEspecial | null>(null);
  readonly modalFormAberto = signal(false);
  readonly erroFormulario = signal('');

  readonly jornadaParaExcluir = signal<JornadaEspecial | null>(null);
  readonly modalExcluirAberto = signal(false);
  readonly erroExclusao = signal('');

  readonly tamanhoPagina = signal<number>(10);

  protected readonly cols = computed<TableColumn<JornadaEspecial>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Título', template: this.tituloTemplate, width: '28%' },
      { header: 'Período', template: this.periodoTemplate, width: '22%' },
      { header: 'Horário', template: this.horarioTemplate, width: '22%' },
      { header: 'Escopo', template: this.escopoTemplate, width: '16%' },
      { header: 'Ações', template: this.acoesTemplate, width: '12%' },
    ];
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.carregar(), this.carregarProfissionais()]);
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
      const dados = await this.jornadaService.listarJornadas(inicio, fim);
      this.jornadas.set(dados);
    } catch {
      this.jornadas.set([]);
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

  mudarFiltroEscopo(evento: Event): void {
    this.filtroEscopo.set((evento.target as HTMLSelectElement).value);
  }

  // ─── Criação / Edição (RN-147-2) ─────────────────────────────────────────

  abrirCriacao(): void {
    this.erroFormulario.set('');
    this.jornadaSelecionada.set(null);
    this.modalFormAberto.set(true);
  }

  abrirEdicao(jornada: JornadaEspecial): void {
    this.erroFormulario.set('');
    this.jornadaSelecionada.set(jornada);
    this.modalFormAberto.set(true);
  }

  fecharFormulario(): void {
    this.modalFormAberto.set(false);
    this.erroFormulario.set('');
  }

  async aoSalvarFormulario(comando: CriarJornadaEspecialCommand): Promise<void> {
    const existente = this.jornadaSelecionada();
    if (this.salvando()) {
      return;
    }
    this.salvando.set(true);
    try {
      if (existente) {
        await this.jornadaService.atualizarJornada({ ...comando, id: existente.id, ativo: existente.ativo });
        this.toastService.success('Jornada especial atualizada com sucesso!', 'Sucesso');
      } else {
        await this.jornadaService.criarJornada(comando);
        this.toastService.success('Jornada especial cadastrada com sucesso!', 'Sucesso');
      }
      this.fecharFormulario();
      await this.carregar();
    } catch (erro) {
      // Erro da API (ex.: Jornada.DataInvalida) é exibido no formulário, que permanece
      // aberto com os dados digitados (RN-147-2).
      this.erroFormulario.set(this.extrairMensagemErro(erro));
    } finally {
      this.salvando.set(false);
      this.cdr.markForCheck();
    }
  }

  // ─── Exclusão (RN-147-3) ─────────────────────────────────────────────────

  solicitarExclusao(jornada: JornadaEspecial): void {
    this.erroExclusao.set('');
    this.jornadaParaExcluir.set(jornada);
    this.modalExcluirAberto.set(true);
  }

  fecharExclusao(): void {
    this.modalExcluirAberto.set(false);
    this.jornadaParaExcluir.set(null);
    this.erroExclusao.set('');
  }

  async confirmarExclusao(): Promise<void> {
    const jornada = this.jornadaParaExcluir();
    if (!jornada || this.excluindo()) {
      return;
    }
    this.excluindo.set(true);
    try {
      await this.jornadaService.removerJornada(jornada.id);
      this.toastService.success('Jornada especial excluída com sucesso!', 'Sucesso');
      this.fecharExclusao();
      await this.carregar();
    } catch (erro) {
      // Falha da API: o item permanece na listagem e o erro é exibido (RN-147-3).
      this.erroExclusao.set(this.extrairMensagemErro(erro));
    } finally {
      this.excluindo.set(false);
      this.cdr.markForCheck();
    }
  }

  // ─── Helpers de exibição ─────────────────────────────────────────────────

  formatarData(iso: string): string {
    if (!iso) return '';
    const partes = iso.split('T')[0].split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return iso;
  }

  formatarPeriodo(jornada: JornadaEspecial): string {
    const inicio = jornada.dataInicio.split('T')[0] ?? '';
    const fim = jornada.dataFim.split('T')[0] ?? '';
    const inicioLegivel = this.formatarData(jornada.dataInicio);
    return inicio === fim ? inicioLegivel : `${inicioLegivel} até ${this.formatarData(jornada.dataFim)}`;
  }

  private async carregarProfissionais(): Promise<void> {
    try {
      await this.gestaoUsuariosService.carregarUsuarios();
      const profissionaisDoEstabelecimento = this.gestaoUsuariosService
        .usuarios()
        .filter((u) => u.perfil === 'Profissional' || (u.perfil && u.perfil.includes('Profissional')))
        .map((u) => ({ id: u.id, nome: `${u.nome} ${u.sobrenome ?? ''}`.trim() }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
      this.profissionais.set(profissionaisDoEstabelecimento);
    } catch {
      this.profissionais.set([]);
    }
  }

  /** Extrai a mensagem legível do corpo de erro da API (mesmas formas tratadas pelo interceptor). */
  private extrairMensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      const corpo = erro.error as {
        erro?: string;
        message?: string;
        detail?: string;
        title?: string;
        Message?: string;
      } | null;
      const mensagem = corpo?.erro || corpo?.message || corpo?.detail || corpo?.title || corpo?.Message;
      if (mensagem) {
        return mensagem;
      }
    }
    return 'Não foi possível concluir a operação. Verifique os dados e tente novamente.';
  }
}

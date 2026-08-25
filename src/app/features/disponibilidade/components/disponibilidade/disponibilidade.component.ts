import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  TableColumn,
  TmSelectComponent,
  TmSelectOption,
  TmTableComponent,
  TmTimeComponent,
  TmToastService,
} from '@techminds-group/tm-angular-lib';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Agendamento } from '../../../../core/models/agenda.model';
import {
  DiaDisponibilidade,
  DisponibilidadeProfissional,
  IntervaloDisponibilidade,
} from '../../../../core/models/disponibilidade/disponibilidade.model';
import { DiaFuncionamento } from '../../../../core/models/configuracoes/horario-estabelecimento.model';
import { Usuario } from '../../../../core/models/gestao-usuarios/usuario.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { ClubesService } from '../../../../core/services/clubes.service';
import { DisponibilidadeService } from '../../../../core/services/disponibilidade.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { LanguageService } from '../../../../core/services/language.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { DIAS_SEMANA_FORM, INTERVALO_PADRAO } from '../../models/disponibilidade-form.config.model';
import { DisponibilidadeConflitosComponent } from '../modais/disponibilidade-conflitos/disponibilidade-conflitos.component';
import { GestaoUsuariosHelperService } from '../../../gestao-usuarios/services/gestao-usuarios-helper.service';
import { PerfilBadgePipe } from '../../../gestao-usuarios/pipes/perfil-badge.pipe';
import { StatusBadgePipe } from '../../../gestao-usuarios/pipes/status-badge.pipe';

@Component({
  selector: 'app-disponibilidade',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TmSelectComponent,
    TmTimeComponent,
    TmTableComponent,
    DisponibilidadeConflitosComponent,
    PerfilBadgePipe,
    StatusBadgePipe,
  ],
  templateUrl: './disponibilidade.component.html',
  styleUrl: './disponibilidade.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GestaoUsuariosHelperService],
})
export class DisponibilidadeComponent implements OnInit, AfterViewInit {
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(TmToastService);
  private readonly disponibilidadeService = inject(DisponibilidadeService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly catalogoService = inject(CatalogoService);
  protected readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly clubesService = inject(ClubesService);
  protected readonly themeService = inject(ThemeService);

  @ViewChild('usuarioTemplate', { static: true }) usuarioTemplate!: TemplateRef<{ $implicit: Usuario }>;
  @ViewChild('perfilTemplate', { static: true }) perfilTemplate!: TemplateRef<{ $implicit: Usuario }>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<{ $implicit: Usuario }>;
  @ViewChild('acoesTemplate', { static: true }) acoesTemplate!: TemplateRef<{ $implicit: Usuario }>;

  private readonly templatesReady = signal(false);
  protected readonly tamanhoPagina = signal<number>(10);

  protected readonly diasSemanaConfig = DIAS_SEMANA_FORM;

  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);

  /** Se true, personaliza os horários; se false, utiliza os horários do estabelecimento. */
  protected readonly usarHorarioEstabelecimento = signal(false);

  @Input() embedded = false;

  @Input() set profissionalId(id: string | null | undefined) {
    if (id && id !== this.profissionalAlvo()) {
      this.profissionalAlvo.set(id);
      void this.carregarDisponibilidade(id);
    }
  }

  /** Profissional alvo da edição (quando null, exibe a tabela de profissionais). */
  protected readonly profissionalAlvo = signal<string | null>(null);
  protected readonly servicosSelecionados = signal<string[]>([]);
  protected readonly planosSelecionados = signal<string[]>([]);

  @Input() set readOnly(val: boolean) {
    this.modoEdicao.set(!val);
  }

  /** Controla se os campos da tela estão em modo de edição (true) ou somente leitura (false). */
  protected readonly modoEdicao = signal<boolean>(true);

  /** Agendamentos que ficaram fora da nova disponibilidade. */
  protected readonly conflitos = signal<Agendamento[]>([]);
  protected readonly showConflitosModal = signal(false);

  /** Snapshot do estado inicial carregado do servidor para verificação de alterações não salvas. */
  protected readonly estadoInicial = signal<{
    usarEst: boolean;
    servicos: string[];
    planos: string[];
    dias: DiaFuncionamento[];
  } | null>(null);

  /** Lista de profissionais para a tabela. Administrador vê todos; Profissional não-admin vê apenas a si mesmo. */
  protected readonly profissionais = computed<Usuario[]>(() => {
    const todos = this.gestaoUsuariosService.usuarios().filter((u) => u.status !== 'Inativo');
    const profs = todos.filter(
      (u) =>
        u.perfil === 'Profissional' ||
        (u.perfil && u.perfil.includes('Profissional')) ||
        (u.perfil && u.perfil.includes('Administrador')),
    );
    const list = profs.length > 0 ? profs : todos;

    if (this.authService.hasAdminRole()) {
      return list;
    }

    const currentUserId = this.authService.currentUserId();
    return list.filter((u) => u.id === currentUserId);
  });

  /** Colunas da tabela de profissionais (Profissional e Status). */
  protected readonly cols = computed<TableColumn<Usuario>[]>(() => {
    this.languageService.currentLang();
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: this.languageService.translate('USUARIOS.COLUMNS.USER'), template: this.usuarioTemplate, width: '60%' },
      { header: this.languageService.translate('USUARIOS.COLUMNS.STATUS'), template: this.statusTemplate, width: '40%' },
    ];
  });

  /** Retorna true somente se houver alterações não salvas na tela. */
  protected readonly temAlteracoes = computed<boolean>(() => {
    const inicial = this.estadoInicial();
    if (!inicial) return false;

    if (this.usarHorarioEstabelecimento() !== inicial.usarEst) return true;

    const servicosAtuais = [...this.servicosSelecionados()].sort();
    const servicosIniciais = [...inicial.servicos].sort();
    if (JSON.stringify(servicosAtuais) !== JSON.stringify(servicosIniciais)) return true;

    const planosAtuais = [...this.planosSelecionados()].sort();
    const planosIniciais = [...inicial.planos].sort();
    if (JSON.stringify(planosAtuais) !== JSON.stringify(planosIniciais)) return true;

    if (this.usarHorarioEstabelecimento()) {
      const diasAtuais = this.diasFuncionamento();
      if (diasAtuais.length !== inicial.dias.length) return true;
      for (let i = 0; i < diasAtuais.length; i++) {
        const d1 = diasAtuais[i];
        const d2 = inicial.dias[i];
        if (
          d1.ativo !== d2.ativo ||
          d1.horaAbertura !== d2.horaAbertura ||
          d1.horaFechamento !== d2.horaFechamento ||
          d1.temIntervalo !== d2.temIntervalo ||
          d1.intervaloInicio !== d2.intervaloInicio ||
          d1.intervaloFim !== d2.intervaloFim
        ) {
          return true;
        }
      }
    }

    return false;
  });

  /** Dias da semana com abertura/fechamento e intervalo de almoço. */
  protected readonly diasFuncionamento = signal<DiaFuncionamento[]>(
    DIAS_SEMANA_FORM.map((dia) => this.criarDiaPadrao(dia.diaSemana)),
  );

  protected readonly isAdmin = this.authService.hasAdminRole;

  protected readonly profissionalAtual = computed(() => {
    const id = this.profissionalAlvo();
    if (!id) return null;
    return this.gestaoUsuariosService.usuarios().find((u) => u.id === id) ?? null;
  });

  /** Serviços ativos do catálogo para o checklist. */
  protected readonly servicoOptions = computed<TmSelectOption<string>[]>(() =>
    this.catalogoService
      .servicos()
      .filter((s) => s.status === 'Ativo')
      .map((s) => ({ value: s.id, label: s.nome })),
  );

  /** Planos ativos do estabelecimento para o checklist. */
  protected readonly planoOptions = computed<TmSelectOption<string>[]>(() =>
    this.clubesService
      .clubes()
      .filter((c) => c.status === 'Ativo')
      .map((c) => ({ value: c.id, label: c.nome })),
  );

  async ngOnInit(): Promise<void> {
    this.clubesService.carregarClubes().subscribe();
    await Promise.all([
      this.catalogoService.carregarServicos(),
      this.gestaoUsuariosService.carregarUsuarios(),
    ]);

    const routeId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('id');

    if (routeId) {
      this.profissionalAlvo.set(routeId);
      await this.carregarDisponibilidade(routeId);
    }
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  /** Abre os detalhes de disponibilidade do profissional selecionado na tabela. */
  protected selecionarProfissional(user: Usuario): void {
    if (user?.id) {
      this.profissionalAlvo.set(user.id);
      void this.carregarDisponibilidade(user.id);
    }
  }

  /** Retorna da tela de detalhes para a tabela de profissionais (ou volta no histórico se acessado via ID). */
  protected voltar(): void {
    const routeId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('id');
    if (routeId) {
      this.location.back();
    } else {
      this.profissionalAlvo.set(null);
    }
  }

  protected async onToggleUsarHorarioEstabelecimento(event: Event): Promise<void> {
    const checked = (event.target as HTMLInputElement).checked;
    this.usarHorarioEstabelecimento.set(checked);
    if (!checked) {
      await this.usarHorariosEstabelecimento();
    }
  }

  protected onDiaAtivoChange(dia: DiaFuncionamento, val: boolean): void {
    dia.ativo = val;
    this.diasFuncionamento.update((dias) => [...dias]);
  }

  protected onIntervaloSwitchChange(dia: DiaFuncionamento, val: boolean): void {
    dia.temIntervalo = val;
    this.diasFuncionamento.update((dias) => [...dias]);
  }

  protected setHoraAbertura(dia: DiaFuncionamento, val: string): void {
    dia.horaAbertura = val;
    this.diasFuncionamento.update((dias) => [...dias]);
  }

  protected setHoraFechamento(dia: DiaFuncionamento, val: string): void {
    dia.horaFechamento = val;
    this.diasFuncionamento.update((dias) => [...dias]);
  }

  protected getIntervaloInicio(dia: DiaFuncionamento): string {
    return dia.intervaloInicio || '12:00';
  }

  protected setIntervaloInicio(dia: DiaFuncionamento, val: string): void {
    dia.intervaloInicio = val || '12:00';
    this.diasFuncionamento.update((dias) => [...dias]);
  }

  protected getIntervaloFim(dia: DiaFuncionamento): string {
    return dia.intervaloFim || '13:00';
  }

  protected setIntervaloFim(dia: DiaFuncionamento, val: string): void {
    dia.intervaloFim = val || '13:00';
    this.diasFuncionamento.update((dias) => [...dias]);
  }

  /** Copia o status e horários do dia informado para todos os outros dias da semana. */
  protected copiarParaTodos(diaOrigem: DiaFuncionamento): void {
    const atualizado = this.diasFuncionamento().map((dia) =>
      dia.diaSemana === diaOrigem.diaSemana
        ? dia
        : {
            ...dia,
            ativo: diaOrigem.ativo,
            horaAbertura: diaOrigem.horaAbertura,
            horaFechamento: diaOrigem.horaFechamento,
            temIntervalo: diaOrigem.temIntervalo,
            intervaloInicio: diaOrigem.intervaloInicio,
            intervaloFim: diaOrigem.intervaloFim,
          },
    );
    this.diasFuncionamento.set(atualizado);
    const nomeDia = this.traduzir(this.diasSemanaConfig[diaOrigem.diaSemana].i18nKey);
    this.toastService.success(`Horários de ${nomeDia} copiados para todos os dias!`);
  }

  /** Sincroniza a disponibilidade do profissional com os horários do estabelecimento. */
  protected async usarHorariosEstabelecimento(): Promise<void> {
    this.carregando.set(true);
    try {
      const horariosEst = await this.estabelecimentoService.carregarHorarios();
      this.diasFuncionamento.set(
        this.diasFuncionamento().map((dia) => {
          const configEst = horariosEst.find((h) => h.diaSemana === dia.diaSemana);
          if (!configEst || !configEst.ativo) {
            return { ...dia, ativo: false };
          }
          return {
            ...dia,
            ativo: true,
            horaAbertura: this.normalizarHora(configEst.horaAbertura),
            horaFechamento: this.normalizarHora(configEst.horaFechamento),
            temIntervalo: configEst.temIntervalo,
            intervaloInicio: configEst.intervaloInicio ? this.normalizarHora(configEst.intervaloInicio) : '12:00',
            intervaloFim: configEst.intervaloFim ? this.normalizarHora(configEst.intervaloFim) : '13:00',
          };
        }),
      );
    } catch (_unused: unknown) {
      this.toastService.error('Erro ao buscar horários do estabelecimento');
    } finally {
      this.carregando.set(false);
    }
  }

  protected habilitarEdicao(): void {
    this.modoEdicao.set(true);
  }

  protected onServicosChange(valor: unknown): void {
    if (!this.modoEdicao()) return;
    this.servicosSelecionados.set(Array.isArray(valor) ? (valor as string[]) : []);
  }

  protected selecionarTodosServicos(): void {
    if (!this.modoEdicao()) return;
    const todos = this.servicoOptions().map((opt) => opt.value);
    this.servicosSelecionados.set(todos);
  }

  protected desmarcarTodosServicos(): void {
    if (!this.modoEdicao()) return;
    this.servicosSelecionados.set([]);
  }

  protected onPlanosChange(valor: unknown): void {
    if (!this.modoEdicao()) return;
    this.planosSelecionados.set(Array.isArray(valor) ? (valor as string[]) : []);
  }

  protected selecionarTodosPlanos(): void {
    if (!this.modoEdicao()) return;
    const todos = this.planoOptions().map((opt) => opt.value);
    this.planosSelecionados.set(todos);
  }

  protected desmarcarTodosPlanos(): void {
    if (!this.modoEdicao()) return;
    this.planosSelecionados.set([]);
  }

  /** Traduz chaves dinâmicas via serviço de tradução. */
  protected traduzir(chave: string): string {
    return this.languageService.translate(chave);
  }

  /** Carrega a disponibilidade do profissional alvo e popula o formulário. */
  protected async carregarDisponibilidade(profissionalId: string): Promise<void> {
    this.carregando.set(true);
    this.modoEdicao.set(false);
    try {
      const dados = await this.disponibilidadeService.getDisponibilidade(profissionalId);
      await this.popularForm(dados);
    } catch (_unused: unknown) {
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.TOAST_ERRO_CARREGAR'));
    } finally {
      this.carregando.set(false);
    }
  }

  public async cancelar(): Promise<void> {
    const profId = this.profissionalAlvo();
    if (profId) {
      await this.carregarDisponibilidade(profId);
      this.toastService.info('Alterações descartadas.');
    } else {
      this.voltar();
    }
    this.modoEdicao.set(false);
  }

  public async salvar(): Promise<void> {
    const profissionalId = this.profissionalAlvo();
    if (!profissionalId) {
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.SEM_PROFISSIONAIS'));
      return;
    }

    this.salvando.set(true);
    try {
      if (!this.usarHorarioEstabelecimento()) {
        await this.usarHorariosEstabelecimento();
      }

      const payload = this.montarPayload(profissionalId);
      const resultado = await this.disponibilidadeService.salvarDisponibilidade(
        profissionalId,
        payload,
      );

      localStorage.setItem(
        `groom_usar_est_${profissionalId}`,
        this.usarHorarioEstabelecimento() ? 'true' : 'false',
      );
      localStorage.setItem(
        `groom_servicos_${profissionalId}`,
        JSON.stringify(this.servicosSelecionados()),
      );
      localStorage.setItem(
        `groom_planos_${profissionalId}`,
        JSON.stringify(this.planosSelecionados()),
      );

      this.atualizarEstadoInicial();
      this.modoEdicao.set(false);
      this.toastService.success(this.languageService.translate('DISPONIBILIDADE.TOAST_SUCESSO'));

      if (resultado.conflitos && resultado.conflitos.length > 0) {
        this.conflitos.set(resultado.conflitos);
        this.showConflitosModal.set(true);
      }
    } catch (_unused: unknown) {
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.TOAST_ERRO'));
    } finally {
      this.salvando.set(false);
    }
  }

  protected fecharConflitosModal(): void {
    this.showConflitosModal.set(false);
  }

  private async popularForm(dados: DisponibilidadeProfissional): Promise<void> {
    const profId = this.profissionalAlvo();

    let servs = dados.servicoIds ?? [];
    if (servs.length === 0 && profId) {
      const storedServs = localStorage.getItem(`groom_servicos_${profId}`);
      if (storedServs) {
        try {
          servs = JSON.parse(storedServs);
        } catch (_unused: unknown) {}
      }
    }
    this.servicosSelecionados.set(servs);

    let plans = dados.planoIds ?? [];
    if (plans.length === 0 && profId) {
      const storedPlans = localStorage.getItem(`groom_planos_${profId}`);
      if (storedPlans) {
        try {
          plans = JSON.parse(storedPlans);
        } catch (_unused: unknown) {}
      }
    }
    this.planosSelecionados.set(plans);

    const storedVal = profId ? localStorage.getItem(`groom_usar_est_${profId}`) : null;
    const personalizar = storedVal === 'true';
    this.usarHorarioEstabelecimento.set(personalizar);

    this.diasFuncionamento.set(
      this.diasFuncionamento().map((dia) => {
        const registro = dados.dias?.find((d) => d.diaSemana === dia.diaSemana);
        if (!registro || !registro.trabalhaHoje) {
          return { ...dia, ativo: false };
        }
        const intervalos = registro.intervalos ?? [];
        if (intervalos.length <= 1) {
          const unico = intervalos[0];
          return {
            ...dia,
            ativo: true,
            horaAbertura: unico ? this.normalizarHora(unico.horaInicio) : dia.horaAbertura,
            horaFechamento: unico ? this.normalizarHora(unico.horaFim) : dia.horaFechamento,
            temIntervalo: false,
            intervaloInicio: '12:00',
            intervaloFim: '13:00',
          };
        }
        const ultimo = intervalos[intervalos.length - 1];
        return {
          ...dia,
          ativo: true,
          horaAbertura: this.normalizarHora(intervalos[0].horaInicio),
          horaFechamento: this.normalizarHora(ultimo.horaFim),
          temIntervalo: true,
          intervaloInicio: this.normalizarHora(intervalos[0].horaFim),
          intervaloFim: this.normalizarHora(ultimo.horaInicio),
        };
      }),
    );

    if (!personalizar) {
      await this.usarHorariosEstabelecimento();
    }

    this.atualizarEstadoInicial();
  }

  private montarPayload(profissionalId: string): DisponibilidadeProfissional {
    const dias: DiaDisponibilidade[] = this.diasFuncionamento().map((dia) => {
      if (!dia.ativo) {
        return { diaSemana: dia.diaSemana, trabalhaHoje: false, intervalos: [] };
      }
      const abertura = this.normalizarHora(dia.horaAbertura);
      const fechamento = this.normalizarHora(dia.horaFechamento);
      const intervalos: IntervaloDisponibilidade[] = [];
      if (dia.temIntervalo && dia.intervaloInicio && dia.intervaloFim) {
        intervalos.push(
          { horaInicio: abertura, horaFim: this.normalizarHora(dia.intervaloInicio) },
          { horaInicio: this.normalizarHora(dia.intervaloFim), horaFim: fechamento },
        );
      } else {
        intervalos.push({ horaInicio: abertura, horaFim: fechamento });
      }
      return { diaSemana: dia.diaSemana, trabalhaHoje: true, intervalos };
    });
    return {
      profissionalId,
      dias,
      servicoIds: [...this.servicosSelecionados()],
      planoIds: [...this.planosSelecionados()],
    };
  }

  private criarDiaPadrao(diaSemana: number): DiaFuncionamento {
    return {
      diaSemana,
      ativo: false,
      horaAbertura: INTERVALO_PADRAO.horaInicio,
      horaFechamento: INTERVALO_PADRAO.horaFim,
      temIntervalo: false,
      intervaloInicio: '12:00',
      intervaloFim: '13:00',
    };
  }

  private normalizarHora(val?: string): string {
    if (!val) return '08:00';
    const partes = val.split(':');
    if (partes.length >= 2) {
      return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`;
    }
    return val;
  }

  private atualizarEstadoInicial(): void {
    this.estadoInicial.set({
      usarEst: this.usarHorarioEstabelecimento(),
      servicos: [...this.servicosSelecionados()],
      planos: [...this.planosSelecionados()],
      dias: JSON.parse(JSON.stringify(this.diasFuncionamento())),
    });
  }
}
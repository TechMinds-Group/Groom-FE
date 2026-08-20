import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TmSelectComponent, TmSelectOption, TmTimeComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Agendamento } from '../../../../core/models/agenda.model';
import {
  DiaDisponibilidade,
  DisponibilidadeProfissional,
  IntervaloDisponibilidade,
} from '../../../../core/models/disponibilidade/disponibilidade.model';
import { DiaFuncionamento } from '../../../../core/models/configuracoes/horario-estabelecimento.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { ClubesService } from '../../../../core/services/clubes.service';
import { DisponibilidadeService } from '../../../../core/services/disponibilidade.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { LanguageService } from '../../../../core/services/language.service';
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
    DisponibilidadeConflitosComponent,
    PerfilBadgePipe,
    StatusBadgePipe,
  ],
  templateUrl: './disponibilidade.component.html',
  styleUrl: './disponibilidade.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GestaoUsuariosHelperService],
})
export class DisponibilidadeComponent implements OnInit {
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(TmToastService);
  private readonly disponibilidadeService = inject(DisponibilidadeService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly clubesService = inject(ClubesService);

  protected readonly diasSemanaConfig = DIAS_SEMANA_FORM;

  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly usarHorarioEstabelecimento = signal(true);
  /** Profissional alvo da edição (admin escolhe; profissional-only usa o próprio id). */
  protected readonly profissionalAlvo = signal<string>('');
  protected readonly servicosSelecionados = signal<string[]>([]);
  protected readonly planosSelecionados = signal<string[]>([]);
  /** Agendamentos que ficaram fora da nova disponibilidade (D-06 — o save não é bloqueado). */
  protected readonly conflitos = signal<Agendamento[]>([]);
  protected readonly showConflitosModal = signal(false);

  /** Snapshot do estado inicial carregado do servidor para verificação de alterações não salvas. */
  protected readonly estadoInicial = signal<{
    usarEst: boolean;
    servicos: string[];
    planos: string[];
    dias: DiaFuncionamento[];
  } | null>(null);

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

    return false;
  });

  /** Dias da semana com abertura/fechamento e intervalo de almoço — mesmo objeto da tela de Configurações do Estabelecimento. */
  protected readonly diasFuncionamento = signal<DiaFuncionamento[]>(
    DIAS_SEMANA_FORM.map((dia) => this.criarDiaPadrao(dia.diaSemana)),
  );

  protected readonly isAdmin = this.authService.hasAdminRole;

  protected readonly profissionalAtual = computed(() => {
    const id = this.profissionalAlvo();
    if (!id) return null;
    return this.gestaoUsuariosService.usuarios().find((u) => u.id === id) ?? null;
  });

  /** Profissionais do tenant com perfil Profissional (padrão ProfissionaisComponent). */
  protected readonly profissionalOptions = computed<TmSelectOption<string>[]>(() =>
    this.gestaoUsuariosService
      .usuarios()
      .filter((u) => u.perfil === 'Profissional' || (u.perfil && u.perfil.includes('Profissional')))
      .map((u) => ({ value: u.id, label: u.nome })),
  );

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
    const usuario = this.authService.currentUser();

    // Se o usuário não for administrador, força a carregar apenas a sua própria disponibilidade
    if (!this.authService.hasAdminRole() && usuario?.id) {
      this.profissionalAlvo.set(usuario.id);
      await this.carregarDisponibilidade(usuario.id);
      return;
    }

    if (routeId) {
      this.profissionalAlvo.set(routeId);
      await this.carregarDisponibilidade(routeId);
      return;
    }

    if (this.authService.hasAdminRole()) {
      // Admin: preseleciona o primeiro profissional para a tela já vir carregada.
      const primeiro = this.profissionalOptions()[0];
      if (primeiro) {
        this.profissionalAlvo.set(primeiro.value);
        await this.carregarDisponibilidade(primeiro.value);
      }
      return;
    }
    if (usuario?.id) {
      this.profissionalAlvo.set(usuario.id);
      await this.carregarDisponibilidade(usuario.id);
    }
  }

  protected voltar(): void {
    this.location.back();
  }

  protected onToggleUsarHorarioEstabelecimento(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.usarHorarioEstabelecimento.set(checked);
    if (checked) {
      void this.usarHorariosEstabelecimento();
    }
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

  /**
   * Sincroniza a disponibilidade do profissional automaticamente com os horários de funcionamento
   * do estabelecimento.
   */
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
            intervaloInicio: configEst.intervaloInicio ? this.normalizarHora(configEst.intervaloInicio) : '',
            intervaloFim: configEst.intervaloFim ? this.normalizarHora(configEst.intervaloFim) : '',
          };
        }),
      );
    } catch {
      this.toastService.error('Erro ao buscar horários do estabelecimento');
    } finally {
      this.carregando.set(false);
    }
  }

  protected onProfissionalChange(valor: unknown): void {
    if (typeof valor === 'string' && valor) {
      this.profissionalAlvo.set(valor);
      void this.carregarDisponibilidade(valor);
    }
  }

  protected onServicosChange(valor: unknown): void {
    this.servicosSelecionados.set(Array.isArray(valor) ? (valor as string[]) : []);
  }

  protected onPlanosChange(valor: unknown): void {
    this.planosSelecionados.set(Array.isArray(valor) ? (valor as string[]) : []);
  }

  /** Traduz chaves dinâmicas (ex: rótulo do dia) via serviço de tradução. */
  protected traduzir(chave: string): string {
    return this.languageService.translate(chave);
  }

  /** Carrega a disponibilidade do profissional alvo e popula o formulário (D-12, sem refresh). */
  protected async carregarDisponibilidade(profissionalId: string): Promise<void> {
    this.carregando.set(true);
    try {
      const dados = await this.disponibilidadeService.getDisponibilidade(profissionalId);
      await this.popularForm(dados);
    } catch {
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.TOAST_ERRO_CARREGAR'));
    } finally {
      this.carregando.set(false);
    }
  }

  protected async cancelar(): Promise<void> {
    const profId = this.profissionalAlvo();
    if (profId) {
      await this.carregarDisponibilidade(profId);
      this.toastService.info('Alterações descartadas.');
    } else {
      this.voltar();
    }
  }

  protected async salvar(): Promise<void> {
    const profissionalId = this.profissionalAlvo();
    if (!profissionalId) {
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.SEM_PROFISSIONAIS'));
      return;
    }

    this.salvando.set(true);
    try {
      const resultado = await this.disponibilidadeService.salvarDisponibilidade(
        profissionalId,
        this.montarPayload(profissionalId),
      );
      localStorage.setItem(`groom_usar_est_${profissionalId}`, this.usarHorarioEstabelecimento() ? 'true' : 'false');
      this.atualizarEstadoInicial();
      if (resultado.conflitos.length > 0) {
        // D-06: avisa, não bloqueia — o save já foi persistido; abre o modal informativo.
        this.conflitos.set(resultado.conflitos);
        this.showConflitosModal.set(true);
      } else {
        this.toastService.success(this.languageService.translate('DISPONIBILIDADE.TOAST_SUCESSO'));
      }
    } catch {
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.TOAST_ERRO'));
    } finally {
      this.salvando.set(false);
    }
  }

  private criarDiaPadrao(diaSemana: number): DiaFuncionamento {
    return {
      diaSemana,
      ativo: false,
      horaAbertura: INTERVALO_PADRAO.horaInicio,
      horaFechamento: INTERVALO_PADRAO.horaFim,
      temIntervalo: false,
      intervaloInicio: '',
      intervaloFim: '',
    };
  }

  private async popularForm(dados: DisponibilidadeProfissional): Promise<void> {
    this.servicosSelecionados.set(dados.servicoIds ?? []);
    this.planosSelecionados.set(dados.planoIds ?? []);

    const profId = this.profissionalAlvo();
    const storedVal = profId ? localStorage.getItem(`groom_usar_est_${profId}`) : null;
    const usarEst = storedVal === null ? (!dados.dias || dados.dias.length === 0) : storedVal === 'true';
    this.usarHorarioEstabelecimento.set(usarEst);

    // Converte os intervalos persistidos (um ou dois turnos) para o par abertura/fechamento + intervalo de almoço.
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
            intervaloInicio: '',
            intervaloFim: '',
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

    if (usarEst) {
      await this.usarHorariosEstabelecimento();
    }

    this.atualizarEstadoInicial();
  }

  private atualizarEstadoInicial(): void {
    this.estadoInicial.set({
      usarEst: this.usarHorarioEstabelecimento(),
      servicos: [...this.servicosSelecionados()],
      planos: [...this.planosSelecionados()],
      dias: JSON.parse(JSON.stringify(this.diasFuncionamento())),
    });
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
        // Turno 1 (abertura até início do intervalo) + Turno 2 (fim do intervalo até fechamento).
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

  /** Normaliza o valor do tm-time para "HH:mm" (o componente devolve hora como string da lib; a API retorna "HH:mm:ss"). */
  private normalizarHora(valor: string | Date | null): string {
    if (typeof valor === 'string') {
      const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(valor);
      if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
      }
    }
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
      const hora = String(valor.getHours()).padStart(2, '0');
      const minuto = String(valor.getMinutes()).padStart(2, '0');
      return `${hora}:${minuto}`;
    }
    return '';
  }
}
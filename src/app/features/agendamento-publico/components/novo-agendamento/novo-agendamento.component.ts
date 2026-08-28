import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { EstabelecimentoInfo, EstabelecimentoService, obterIconeAleatorioCapa, obterIconeAleatorioLogo } from '../../../../core/services/estabelecimento.service';
import { AgendamentoPublico, HorarioDisponivel, PlanoAtivoCliente, ProfissionalDisponivel, ServicoDisponivel } from '../../../../core/models/agendamento-publico/agendamento-publico.model';
import { AGENDAMENTO_PUBLICO_CONFIG } from '../../models/agendamento-publico.config';
import { TemaPublicoService } from '../../services/tema-publico.service';
import { PassoProfissionalComponent } from './passo-profissional/passo-profissional.component';
import { PassoServicoComponent } from './passo-servico/passo-servico.component';
import { PassoDataHorarioComponent } from './passo-data-horario/passo-data-horario.component';
import { PassoResumoComponent } from './passo-resumo/passo-resumo.component';
import { ConfirmacaoComponent } from './confirmacao/confirmacao.component';
import { DadosFinalizacaoCadastro, FinalizarCadastroComponent } from './finalizar-cadastro/finalizar-cadastro.component';
import { AppFooterComponent } from '../../../../shared/components/footer/app-footer.component';

@Component({
  selector: 'app-novo-agendamento',
  standalone: true,
  imports: [
    MatProgressBarModule,
    PassoProfissionalComponent,
    PassoServicoComponent,
    PassoDataHorarioComponent,
    PassoResumoComponent,
    ConfirmacaoComponent,
    FinalizarCadastroComponent,
    AppFooterComponent,
  ],
  templateUrl: './novo-agendamento.component.html',
  styleUrl: './novo-agendamento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovoAgendamentoComponent implements OnInit, OnDestroy {
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly router = inject(Router);

  /** Aplica o tema do dispositivo (claro/escuro) na tela pública. */
  private readonly temaPublico = inject(TemaPublicoService);

  /** Tema ativo (claro/escuro) para exibir o ícone sol/lua correspondente. */
  readonly temaAtivo = this.temaPublico.tema;

  /** Dados do perfil/identidade do estabelecimento */
  readonly estabelecimentoInfo = signal<EstabelecimentoInfo | null>(null);

  /** Logo com URL absoluta da API (imagens são servidas em /uploads). */
  readonly logoUrlExibicao = computed(() => this.estabelecimentoService.resolverUrl(this.estabelecimentoInfo()?.logoUrl));

  /** Imagem de Capa (Banner) do estabelecimento. */
  readonly capaUrlExibicao = computed(() => {
    const url = this.estabelecimentoInfo()?.capaUrl;
    if (url) {
      return this.estabelecimentoService.resolverUrl(url);
    }
    return '';
  });

  /** Ícones aleatórios estáveis por estabelecimento quando não há imagem cadastrada. */
  readonly logoIconePadrao = computed(() =>
    obterIconeAleatorioLogo(this.estabelecimentoInfo()?.nomeExibicao || this.estabelecimentoInfo()?.nome)
  );

  readonly capaIconePadrao = computed(() =>
    obterIconeAleatorioCapa(this.estabelecimentoInfo()?.nomeExibicao || this.estabelecimentoInfo()?.nome)
  );

  readonly config = AGENDAMENTO_PUBLICO_CONFIG;

  obterUrlGoogleMaps(endereco?: string): string {
    if (!endereco) return '';
    return this.estabelecimentoService.obterUrlGoogleMaps(endereco);
  }

  obterUrlWhatsApp(telefone?: string): string {
    if (!telefone) return '#';
    const digitos = telefone.replace(/\D/g, '');
    if (!digitos) return '#';
    const numeroCompleto = digitos.length <= 11 ? `55${digitos}` : digitos;
    return `https://wa.me/${numeroCompleto}?text=${encodeURIComponent('Olá! Gostaria de informações sobre o agendamento.')}`;
  }

  readonly passo = signal(1);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /** Todos os planos com assinatura ativa do cliente logado. */
  readonly meusPlanos = signal<PlanoAtivoCliente[]>([]);
  /** Plano selecionado pelo cliente para o agendamento atual. */
  readonly planoSelecionado = signal<PlanoAtivoCliente | null>(null);
  /** Plano ativo ativo do cliente (selecionado ou primeiro da lista) — habilita o modo "Meu Plano". */
  readonly meuPlano = computed(() => this.planoSelecionado() ?? this.meusPlanos()[0] ?? null);
  /** Modo de agendamento: serviço avulso ou benefício do plano do cliente. */
  readonly tipoAgendamento = signal<'servico' | 'plano'>('servico');

  readonly profissionais = signal<ProfissionalDisponivel[]>([]);
  readonly servicos = signal<ServicoDisponivel[]>([]);
  readonly horarios = signal<HorarioDisponivel[]>([]);
  /** Dias da semana (0-6) em que o profissional atende — habilita o calendário. */
  readonly diasDisponiveis = signal<number[]>([]);

  readonly profissionalSelecionado = signal<ProfissionalDisponivel | null>(null);
  readonly servicoSelecionado = signal<ServicoDisponivel | null>(null);
  readonly dataSelecionada = signal<string | null>(null);
  readonly horarioSelecionado = signal<string | null>(null);
  readonly agendamentoConfirmado = signal<AgendamentoPublico | null>(null);

  /** Tela de finalização de cadastro (dados incompletos ao confirmar o agendamento). */
  readonly finalizandoCadastro = signal(false);
  readonly salvandoCadastro = signal(false);
  readonly dadosFinalizacao = signal<DadosFinalizacaoCadastro | null>(null);

  /** Etapas do fluxo de agendamento (stepper). */
  readonly steps = [
    { numero: 1, label: 'Profissional', icon: 'fa-solid fa-user' },
    { numero: 2, label: 'Serviço', icon: 'fa-solid fa-scissors' },
    { numero: 3, label: 'Data e hora', icon: 'fa-solid fa-calendar-days' },
    { numero: 4, label: 'Confirmação', icon: 'fa-solid fa-file-circle-check' },
  ] as const;

  /** No modo plano o passo de serviço é pulado (o benefício já está definido no plano). */
  readonly stepsVisiveis = computed(() => {
    if (this.tipoAgendamento() === 'plano') {
      return this.steps.filter((step) => step.numero !== 2);
    }
    return this.steps;
  });

  /** Total do serviço selecionado (resumo lateral). */
  readonly totalServico = computed(() => this.servicoSelecionado()?.preco ?? null);

  /** Duração do agendamento atual: serviço selecionado ou duração total do plano. */
  readonly duracaoAtual = computed(() => {
    if (this.tipoAgendamento() === 'plano') {
      return this.meuPlano()?.duracaoTotal ?? null;
    }
    return this.servicoSelecionado()?.duracao ?? null;
  });

  formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatarData(data: string): string {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  private readonly route = inject(ActivatedRoute);

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('estabelecimento') || this.route.snapshot.parent?.paramMap.get('estabelecimento');
    if (slug) {
      this.agendamentoPublicoService.setEstabelecimento(slug);
    }
    await Promise.all([this.carregarProfissionais(), this.carregarInfoEstabelecimento(), this.carregarMeuPlano()]);
  }

  /** Carrega todos os planos ativos do cliente logado. */
  private async carregarMeuPlano(): Promise<void> {
    const planos = await this.agendamentoPublicoService.getMeusPlanos();
    this.meusPlanos.set(planos);
    if (planos.length > 0 && !this.planoSelecionado()) {
      this.planoSelecionado.set(planos[0]);
    }
  }

  /** Altera o plano ativo selecionado pelo cliente e recarrega os profissionais correspondentes. */
  async selecionarPlanoCliente(plano: PlanoAtivoCliente): Promise<void> {
    if (this.planoSelecionado()?.id === plano.id) {
      return;
    }
    this.planoSelecionado.set(plano);
    this.profissionalSelecionado.set(null);
    this.servicoSelecionado.set(null);
    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.servicos.set([]);
    this.horarios.set([]);
    this.diasDisponiveis.set([]);
    await this.carregarProfissionais();
  }

  private async carregarInfoEstabelecimento(): Promise<void> {
    const slug =
      this.agendamentoPublicoService.estabelecimento() ||
      this.route.snapshot.paramMap.get('estabelecimento') ||
      this.route.snapshot.parent?.paramMap.get('estabelecimento');

    if (slug) {
      this.agendamentoPublicoService.setEstabelecimento(slug);
      try {
        const info = await this.estabelecimentoService.carregarInfoPublico(slug);
        this.estabelecimentoInfo.set(info);
      } catch {
        // Fallback gracioso
      }
    }
  }

  ngOnDestroy(): void {
    this.temaPublico.restaurarTemaAnterior();
  }

  async carregarProfissionais(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      if (this.tipoAgendamento() === 'plano') {
        const plano = this.meuPlano();
        if (!plano) {
          this.profissionais.set([]);
          return;
        }
        this.profissionais.set(await this.agendamentoPublicoService.getProfissionaisPlano(plano.id));
      } else {
        this.profissionais.set(await this.agendamentoPublicoService.getProfissionais());
      }
    } catch {
      this.errorMessage.set('Não foi possível carregar os profissionais. Tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Alterna entre agendar um serviço avulso ou o benefício do plano do cliente. */
  async selecionarTipoAgendamento(tipo: 'servico' | 'plano'): Promise<void> {
    if (tipo === this.tipoAgendamento()) {
      return;
    }
    this.tipoAgendamento.set(tipo);
    this.passo.set(1);
    this.profissionalSelecionado.set(null);
    this.servicoSelecionado.set(null);
    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.servicos.set([]);
    this.horarios.set([]);
    this.diasDisponiveis.set([]);
    await this.carregarProfissionais();
  }

  async selecionarProfissional(profissional: ProfissionalDisponivel): Promise<void> {
    this.profissionalSelecionado.set(profissional);
    this.servicoSelecionado.set(null);
    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.servicos.set([]);
    this.horarios.set([]);
    this.diasDisponiveis.set([]);
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const disponibilidade = await this.agendamentoPublicoService.getDisponibilidadeSemanal(profissional.id);
      this.diasDisponiveis.set(
        disponibilidade.filter((d) => d.trabalhaHoje && d.intervalos.length > 0).map((d) => d.diaSemana),
      );

      if (this.tipoAgendamento() === 'plano') {
        // No modo plano o benefício já é definido pelo plano — vai direto para data/hora
        this.passo.set(3);
      } else {
        const servicos = await this.agendamentoPublicoService.getServicosProfissional(profissional.id);
        this.servicos.set(servicos);
        this.passo.set(2);
      }
    } catch {
      this.errorMessage.set('Não foi possível carregar os serviços. Tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  selecionarServico(servico: ServicoDisponivel): void {
    this.servicoSelecionado.set(servico);
    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.horarios.set([]);
    this.passo.set(3);
  }

  async carregarHorarios(data: string): Promise<void> {
    const profissional = this.profissionalSelecionado();
    const servico = this.servicoSelecionado();
    if (!profissional) {
      return;
    }
    if (this.tipoAgendamento() === 'plano') {
      const plano = this.meuPlano();
      if (!plano) {
        return;
      }
      this.isLoading.set(true);
      this.errorMessage.set(null);
      try {
        this.horarios.set(await this.agendamentoPublicoService.getHorariosPlano(plano.id, profissional.id, data));
      } catch {
        this.errorMessage.set('Não foi possível carregar os horários. Tente novamente.');
      } finally {
        this.isLoading.set(false);
      }
      return;
    }

    if (!servico) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      this.horarios.set(await this.agendamentoPublicoService.getHorarios(profissional.id, data, servico.id));
    } catch {
      this.errorMessage.set('Não foi possível carregar os horários. Tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  selecionarData(data: string): void {
    this.dataSelecionada.set(data);
    this.horarioSelecionado.set(null);
    void this.carregarHorarios(data);
  }

  selecionarHorario(horario: string): void {
    this.horarioSelecionado.set(horario);
    this.passo.set(4);
  }

  async confirmar(): Promise<void> {
    const profissional = this.profissionalSelecionado();
    const data = this.dataSelecionada();
    const horario = this.horarioSelecionado();
    if (!profissional || !data || !horario) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      let agendamento: AgendamentoPublico;
      if (this.tipoAgendamento() === 'plano') {
        const plano = this.meuPlano();
        if (!plano) {
          return;
        }
        agendamento = await this.agendamentoPublicoService.criarAgendamentoPlano({
          profissionalId: profissional.id,
          planoId: plano.id,
          dataInicio: `${data}T${horario}:00`,
        });
      } else {
        const servico = this.servicoSelecionado();
        if (!servico) {
          return;
        }
        agendamento = await this.agendamentoPublicoService.criarAgendamento({
          profissionalId: profissional.id,
          servicoId: servico.id,
          dataInicio: `${data}T${horario}:00`,
        });
      }
      this.agendamentoConfirmado.set(agendamento);
      this.passo.set(5);
    } catch (err: any) {
      const code = err?.error?.code ?? err?.error?.Code;
      if (code === 'Agendamento.ProfissionalSemWhatsApp' || err?.error?.message?.includes('WhatsApp')) {
        this.errorMessage.set('Este profissional ainda não cadastrou um número de WhatsApp para confirmação de agendamentos. Escolha outro profissional ou solicite o cadastro à barbearia.');
      } else if (code === 'Cliente.CadastroIncompleto') {
        await this.abrirFinalizacaoCadastro();
      } else if (code === 'Plano.SemAssinatura') {
        this.errorMessage.set('Sua assinatura do plano não está ativa. Escolha um serviço avulso ou renove sua assinatura.');
      } else {
        this.errorMessage.set('Não foi possível concluir o agendamento. Tente novamente.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Abre a tela de finalização de cadastro com os dados atuais do cliente. */
  private async abrirFinalizacaoCadastro(): Promise<void> {
    const me = await this.agendamentoPublicoService.getMe();
    const nomeCompleto = me?.nome ?? this.clienteLogado()?.nome ?? '';
    const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
    this.dadosFinalizacao.set({
      primeiroNome: partes[0] ?? '',
      ultimoNome: partes.slice(1).join(' '),
      email: me?.email ?? this.clienteLogado()?.email ?? '',
      celular: me?.celular ?? this.clienteLogado()?.celular ?? '',
    });
    this.finalizandoCadastro.set(true);
  }

  async salvarFinalizacaoCadastro(dados: DadosFinalizacaoCadastro): Promise<void> {
    this.salvandoCadastro.set(true);
    this.errorMessage.set(null);
    try {
      await this.agendamentoPublicoService.atualizarDadosCadastro({
        nome: `${dados.primeiroNome} ${dados.ultimoNome}`.trim(),
        email: dados.email,
        celular: dados.celular,
      });
      this.dadosFinalizacao.set(null);
      this.finalizandoCadastro.set(false);
    } catch {
      this.errorMessage.set('Não foi possível salvar seus dados. Confira as informações e tente novamente.');
    } finally {
      this.salvandoCadastro.set(false);
    }
  }

  fecharFinalizacaoCadastro(): void {
    this.finalizandoCadastro.set(false);
  }

  /**
   * Navega para um step clicado no stepper.
   * Voltar para steps anteriores é sempre permitido; avançar exige que as
   * seleções dos steps intermediários já existam (ex: ir ao passo 4 sem data/horário).
   */
  navegarParaStep(numero: number): void {
    if (numero === this.passo()) {
      return;
    }

    if (numero > this.passo() && !this.passoNavegavel(numero)) {
      return;
    }

    this.passo.set(numero);
    this.errorMessage.set(null);
  }

  /** Indica se o step informado pode ser acessado por clique (pré-condições satisfeitas). */
  passoNavegavel(numero: number): boolean {
    const profissional = this.profissionalSelecionado();
    const servico = this.servicoSelecionado();
    const viaPlano = this.tipoAgendamento() === 'plano';

    if (numero === 1) {
      return true;
    }

    if (numero === 2) {
      return !viaPlano && profissional !== null;
    }

    if (numero === 3) {
      return profissional !== null && (viaPlano || servico !== null);
    }

    return profissional !== null && (viaPlano || servico !== null) && this.dataSelecionada() !== null && this.horarioSelecionado() !== null;
  }

  reiniciar(): void {
    this.passo.set(1);
    this.profissionalSelecionado.set(null);
    this.servicoSelecionado.set(null);
    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.agendamentoConfirmado.set(null);
    this.horarios.set([]);
    this.diasDisponiveis.set([]);
  }

  readonly clienteLogado = this.agendamentoPublicoService.clienteLogado;

  /** Alterna entre tema claro e escuro na tela pública. */
  alternarTema(): void {
    this.temaPublico.alternarTema();
  }

  async sair(): Promise<void> {
    const slug =
      this.agendamentoPublicoService.estabelecimento() ||
      this.route.snapshot.paramMap.get('estabelecimento') ||
      this.route.snapshot.parent?.paramMap.get('estabelecimento') ||
      '';
    await this.agendamentoPublicoService.logout();
    if (slug) {
      await this.router.navigate(['/agendamento', slug, 'login']);
    } else {
      await this.router.navigate(['/login']);
    }
  }
}

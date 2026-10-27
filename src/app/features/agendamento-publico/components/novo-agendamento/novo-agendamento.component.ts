import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { MeuAgendamentoItem } from '../../../../core/services/agendamento-publico.service';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { ListaEsperaService } from '../../../../core/services/lista-espera.service';
import { EstabelecimentoInfo, EstabelecimentoService, obterIconeAleatorioCapa, obterIconeAleatorioLogo } from '../../../../core/services/estabelecimento.service';
import { AgendamentoPublico, HorarioDisponivel, PlanoAtivoCliente, ProfissionalDisponivel, ServicoDisponivel } from '../../../../core/models/agendamento-publico/agendamento-publico.model';
import { AGENDAMENTO_PUBLICO_CONFIG } from '../../models/agendamento-publico.config';
import { TemaPublicoService } from '../../services/tema-publico.service';
import { PassoProfissionalComponent } from './passo-profissional/passo-profissional.component';
import { PassoServicoComponent } from './passo-servico/passo-servico.component';
import { PassoDataHorarioComponent } from './passo-data-horario/passo-data-horario.component';
import { PassoResumoComponent } from './passo-resumo/passo-resumo.component';
import { ConfirmacaoComponent } from './confirmacao/confirmacao.component';
import { MeusAgendamentosComponent } from '../meus-agendamentos/meus-agendamentos.component';
import { DadosFinalizacaoCadastro, FinalizarCadastroComponent } from './finalizar-cadastro/finalizar-cadastro.component';
import { ConfirmarAgendamentoExtras } from './passo-resumo/passo-resumo.component';
import { ClienteSessionKeepAliveService } from '../../services/cliente-session-keep-alive.service';
import { ListaEsperaPortalComponent } from '../lista-espera/lista-espera-portal/lista-espera-portal.component';
import { EntrarListaEsperaPayload } from '../../../../core/models/lista-espera/lista-espera.model';
import { AppFooterComponent } from '../../../../shared/components/footer/app-footer.component';
import { ImageViewerModalComponent } from '../../../../shared/modais/image-viewer-modal/image-viewer-modal.component';

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
    ListaEsperaPortalComponent,
    AppFooterComponent,
    ImageViewerModalComponent,
    MeusAgendamentosComponent,
  ],
  templateUrl: './novo-agendamento.component.html',
  styleUrl: './novo-agendamento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovoAgendamentoComponent implements OnInit, OnDestroy {
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly listaEsperaService = inject(ListaEsperaService);
  private readonly clienteKeepAlive = inject(ClienteSessionKeepAliveService);
  private readonly toastService = inject(TmToastService);

  /** Estado do Modal de Visualizacao e Zoom de Imagens */
  readonly showImageViewer = signal<boolean>(false);
  readonly imageViewerUrl = signal<string | null>(null);
  readonly imageViewerImages = signal<string[]>([]);
  readonly imageViewerTitle = signal<string>('');

  /** Guarda o índice da imagem ativa atual para cada plano (muda a cada 3 segundos) */
  protected readonly activeIndicesPlanos = signal<Record<string, number>>({});
  private planosTimer: any = null;

  abrirImagemModal(
    payload: { url?: string; urls?: string[]; titulo: string } | Event,
    urlDirect?: string | null,
    titleDirect?: string,
  ): void {
    if (payload instanceof Event) {
      payload.stopPropagation();
      if (!urlDirect) return;
      this.imageViewerUrl.set(urlDirect);
      this.imageViewerImages.set([urlDirect]);
      this.imageViewerTitle.set(titleDirect || '');
    } else {
      const urls = payload.urls && payload.urls.length > 0 ? payload.urls : payload.url ? [payload.url] : [];
      this.imageViewerUrl.set(urls[0] || null);
      this.imageViewerImages.set(urls);
      this.imageViewerTitle.set(payload.titulo || '');
    }
    this.showImageViewer.set(true);
  }

  obterImagensValidasPlano(p: PlanoAtivoCliente): string[] {
    const raw = [p.imagemUrl, p.imagemUrl2, p.imagemUrl3].filter(Boolean) as string[];
    return raw.map(img => this.estabelecimentoService.resolverUrl(img));
  }

  obterImagemExibicaoPlano(p: PlanoAtivoCliente): string | null {
    const imgs = this.obterImagensValidasPlano(p);
    if (imgs.length === 0) return null;
    const idx = this.activeIndicesPlanos()[p.id] || 0;
    return imgs[idx % imgs.length];
  }
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
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

  /** Tamanho de fonte dinâmico e fluido baseado no número de caracteres do nome */
  readonly tamanhoFonteTitulo = computed(() => {
    const nome = this.estabelecimentoInfo()?.nomeExibicao || this.estabelecimentoInfo()?.nome || 'Barbearia';
    const len = nome.trim().length;
    if (len <= 10) return 'clamp(1.5rem, 4.5vw, 2.1rem)';
    if (len <= 14) return 'clamp(1.35rem, 3.8vw, 1.85rem)';
    if (len <= 18) return 'clamp(1.2rem, 3.2vw, 1.6rem)';
    return 'clamp(1.05rem, 2.8vw, 1.4rem)';
  });

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

  /** CR-004 — visão "Meus agendamentos" no lugar do wizard (cliente logado). */
  readonly visaoMeusAgendamentos = signal(false);

  /** CR-004 — agendamento em remarcação (passo 3 reutilizado com profissional/serviço fixados). */
  readonly remarcacaoAlvo = signal<MeuAgendamentoItem | null>(null);

  /** CR-004 — cupom validado no passo-resumo, refletido no resumo lateral. */
  readonly cupomAplicado = signal<{ codigo: string; percentual: number } | null>(null);

  readonly valorDescontoCupom = computed<number>(() => {
    const cupom = this.cupomAplicado();
    if (!cupom) {
      return 0;
    }

    return Math.max(0, Math.round((this.totalServico() ?? 0) * cupom.percentual) / 100);
  });

  readonly totalComCupom = computed<number>(() =>
    Math.max(0, (this.totalServico() ?? 0) - this.valorDescontoCupom()),
  );

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
    this.planosTimer = setInterval(() => {
      const lista = this.meusPlanos();
      if (!lista || lista.length === 0) return;
      this.activeIndicesPlanos.update(current => {
        const nextMap = { ...current };
        for (const p of lista) {
          const imgs = this.obterImagensValidasPlano(p);
          if (imgs.length > 1) {
            const curIdx = nextMap[p.id] || 0;
            nextMap[p.id] = (curIdx + 1) % imgs.length;
          }
        }
        return nextMap;
      });
    }, 3000);
    // Mantém a sessão do cliente viva (cookie de 30s da RN-028) durante o wizard
    void this.clienteKeepAlive.start();
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
    if (this.planosTimer) {
      clearInterval(this.planosTimer);
    }
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

  // ─── CR-004 — Meus agendamentos no portal ───────────────────────────────

  /** Abre a visão "Meus agendamentos" (botão do banner — só cliente logado). */
  abrirMeusAgendamentos(): void {
    this.visaoMeusAgendamentos.set(true);
  }

  /** Fecha a visão "Meus agendamentos" e volta ao wizard. */
  voltarDoMeusAgendamentos(): void {
    this.visaoMeusAgendamentos.set(false);
  }

  /**
   * Remarcação: fixa profissional/serviço do agendamento, entra no seletor de
   * data/horário do wizard (passo 3) e confirma via endpoint de remarcação.
   */
  async remarcarAgendamento(item: MeuAgendamentoItem): Promise<void> {
    this.visaoMeusAgendamentos.set(false);
    this.remarcacaoAlvo.set(item);

    // Contexto mínimo para o seletor de disponibilidade do wizard.
    this.profissionalSelecionado.set({ id: item.profissionalId, nome: item.profissionalNome });
    if (item.tipo === 'plano' && item.planoId) {
      this.tipoAgendamento.set('plano');
      this.servicoSelecionado.set(null);
    } else {
      this.tipoAgendamento.set('servico');
      this.servicoSelecionado.set({
        id: item.servicoId ?? '',
        nome: item.servicoNome,
        preco: item.servicoPreco,
        duracao: item.servicoDuracao,
      } as ServicoDisponivel);
    }

    this.dataSelecionada.set(null);
    this.horarioSelecionado.set(null);
    this.horarios.set([]);
    this.diasDisponiveis.set([]);
    await this.carregarDisponibilidadeRemarcacao();
    this.passo.set(3);
  }

  /** Carrega os dias disponíveis do profissional para o modo remarcação. */
  private async carregarDisponibilidadeRemarcacao(): Promise<void> {
    const profissional = this.profissionalSelecionado();
    if (!profissional) {
      return;
    }

    this.isLoading.set(true);
    try {
      const disponibilidade = await this.agendamentoPublicoService.getDisponibilidadeSemanal(profissional.id);
      this.diasDisponiveis.set(
        disponibilidade.filter((d) => d.trabalhaHoje && d.intervalos.length > 0).map((d) => d.diaSemana),
      );
    } catch {
      this.errorMessage.set('Não foi possível carregar a disponibilidade. Tente novamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Sai do modo remarcação e volta para "Meus agendamentos". */
  cancelarRemarcacao(): void {
    this.remarcacaoAlvo.set(null);
    this.visaoMeusAgendamentos.set(true);
  }

  /** True quando o passo de data/horário está em modo remarcação. */
  readonly emRemarcacao = computed<boolean>(() => this.remarcacaoAlvo() !== null);

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
    // RN-074 — slot disponível escolhido: garante o fluxo normal de agendamento
    this.modoListaEspera.set(false);
    this.listaEsperaSucesso.set(false);
    this.listaEsperaHora.set(null);
    this.passo.set(4);
  }

  async confirmar(extras?: ConfirmarAgendamentoExtras): Promise<void> {
    // RN-074 — passo 4 em modo lista de espera: confirma a ENTRADA NA FILA, não o agendamento.
    if (this.modoListaEspera()) {
      await this.confirmarEntradaListaEspera();
      return;
    }

    // CR-004 — modo remarcação: confirma a mudança de horário do agendamento alvo.
    const alvoRemarcacao = this.remarcacaoAlvo();
    if (alvoRemarcacao) {
      await this.confirmarRemarcacao(alvoRemarcacao);
      return;
    }

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
          cupomAniversarioId: extras?.cupomAniversarioId,
        });

        // RN-078 (CR-004) — coleta de data de nascimento na confirmação (best-effort:
        // falha não afeta o agendamento já criado).
        if (extras?.dataNascimento) {
          await this.salvarDataNascimentoCliente(extras.dataNascimento);
        }
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

  /**
   * CR-004 — confirma a remarcação do agendamento alvo para a data/horário escolhidos
   * no wizard (hora local tratada como UTC — sem conversão de fuso).
   */
  private async confirmarRemarcacao(alvo: MeuAgendamentoItem): Promise<void> {
    const data = this.dataSelecionada();
    const horario = this.horarioSelecionado();
    if (!data || !horario) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.agendamentoPublicoService.remarcarMeuAgendamento(alvo.id, `${data}T${horario}:00`);
      this.toastService.success('Agendamento remarcado! O profissional receberá uma nova solicitação de confirmação.');
      this.remarcacaoAlvo.set(null);
      this.visaoMeusAgendamentos.set(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const code = err?.error?.code ?? err?.error?.Code;
      const mensagem = err?.error?.message ?? err?.error?.Message;
      if (code === 'Agendamento.HorarioIndisponivel' || code === 'Agendamento.Conflito') {
        this.errorMessage.set(mensagem || 'O horário selecionado não está disponível. Escolha outro.');
      } else if (code === 'Agendamento.JaIniciado' || code === 'Agendamento.StatusInvalido') {
        this.errorMessage.set(mensagem || 'Este agendamento não pode mais ser remarcado.');
      } else {
        this.errorMessage.set(mensagem || 'Não foi possível remarcar o agendamento. Tente novamente.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * RN-074 — confirmação da entrada na fila a partir do passo 4 (slot ocupado escolhido).
   * A entrada usa a janela início+fim do slot (vale apenas por aquele horário) e as
   * preferências já escolhidas nos passos 1-2. `ListaEspera.Duplicada` vira estado de
   * sucesso (o cliente já está na fila — toast do errorInterceptor).
   */
  private async confirmarEntradaListaEspera(): Promise<void> {
    const data = this.dataSelecionada();
    const hora = this.listaEsperaHora();
    if (!data || !hora) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const duracao = this.duracaoAtual() ?? 30;
      const [horaNum, minutoNum] = hora.split(':').map(Number);
      const fim = new Date(2000, 0, 1, horaNum, minutoNum + duracao);
      const horaFim = `${String(fim.getHours()).padStart(2, '0')}:${String(fim.getMinutes()).padStart(2, '0')}`;

      await this.listaEsperaService.entrar({
        dataLista: data,
        servicoId: this.servicoSelecionado()?.id ?? null,
        profissionalId: this.profissionalSelecionado()?.id ?? null,
        horaJanelaInicio: hora,
        horaJanelaFim: horaFim,
      });
      this.listaEsperaSucesso.set(true);
      this.toastService.success('Você entrou na lista de espera!', 'Lista de Espera');
    } catch (err: any) {
      const code = err?.error?.code ?? err?.error?.Code;
      if (code === 'ListaEspera.Duplicada') {
        // Já está na fila (toast do errorInterceptor) — o estado de sucesso é o mesmo
        this.listaEsperaSucesso.set(true);
      } else if (code === 'Cliente.CadastroIncompleto') {
        await this.abrirFinalizacaoCadastro();
      } else {
        this.errorMessage.set('Não foi possível entrar na lista de espera. Tente novamente.');
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
      // RN-074 — default Brasil; o celular vindo do backend já é canônico (com DDI 55)
      codigoPais: '55',
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
        codigoPais: dados.codigoPais,
        celular: dados.celular,
      });
      this.dadosFinalizacao.set(null);
      this.finalizandoCadastro.set(false);

      // RN-074 — cadastro concluído a partir do pedido de entrada na fila:
      // slot ocupado escolhido → avança para o passo de confirmação (modo lista);
      // demais origens → modal de confirmação da fila no widget de origem.
      if (this.listaEsperaPendente !== undefined) {
        const pendente = this.listaEsperaPendente;
        this.listaEsperaPendente = undefined;

        if (pendente.origem === 'passo' && pendente.hora) {
          this.modoListaEspera.set(true);
          this.listaEsperaSucesso.set(false);
          this.listaEsperaHora.set(pendente.hora);
          this.passo.set(4);
          return;
        }

        // O fechamento da finalização recria os widgets do portal no próximo ciclo;
        // o viewChild ainda não existe de forma síncrona — aguarda a re-renderização.
        await new Promise<void>((resolve) => setTimeout(resolve));
        this.abrirModalListaNa(pendente.origem, {
          servicoId: this.servicoSelecionado()?.id ?? null,
          profissionalId: this.profissionalSelecionado()?.id ?? null,
          ...(pendente.hora ? { horaJanelaInicio: pendente.hora } : {}),
        }, pendente.hora);
      }
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

    // CR-004 — em remarcação, voltar para os steps de escolha sai do modo e volta à lista.
    if (this.emRemarcacao() && numero < 3) {
      this.cancelarRemarcacao();
      return;
    }

    if (numero > this.passo() && !this.passoNavegavel(numero)) {
      return;
    }

    // RN-074 — voltar do passo de confirmação cancela o modo lista de espera
    // (o cliente volta ao passo 3 no fluxo normal).
    if (numero < 4) {
      this.modoListaEspera.set(false);
      this.listaEsperaSucesso.set(false);
      this.listaEsperaHora.set(null);
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
    this.modoListaEspera.set(false);
    this.listaEsperaSucesso.set(false);
    this.listaEsperaHora.set(null);
  }

  readonly clienteLogado = this.agendamentoPublicoService.clienteLogado;

  /** RN-078 (CR-004) — coleta de data de nascimento ativa nas configurações do estabelecimento. */
  readonly coletaDataNascimentoAtiva = computed<boolean>(
    () => this.estabelecimentoInfo()?.aniversarioColetaDataNascimento === true,
  );

  /** RN-078 (CR-004) — cliente já tem data de nascimento cadastrada (pergunta só pega quem falta). */
  readonly clienteTemDataNascimento = computed<boolean>(
    () => this.clienteLogado()?.dataNascimento != null,
  );

  /**
   * RN-078 (CR-004) — grava a data informada na confirmação do agendamento. Melhor-esforço:
   * usa os dados atuais do cliente (PUT me exige nome/e-mail/celular completos).
   */
  private async salvarDataNascimentoCliente(dataNascimento: string): Promise<void> {
    try {
      const me = await this.agendamentoPublicoService.getMe();
      if (!me) {
        return;
      }

      await this.agendamentoPublicoService.atualizarDadosCadastro({
        nome: me.nome,
        email: me.email,
        celular: me.celular ?? '',
        dataNascimento,
      });
    } catch {
      // Silencioso: a data é opcional e o cliente pode informá-la depois no cadastro/perfil.
    }
  }

  /** Passo data/horário — hospedeiro do modal da lista de espera no passo 3 (RN-074). */
  private readonly passoDataHorario = viewChild(PassoDataHorarioComponent);

  /** Widget da lista de espera no topo do wizard — hospedeiro do modal do header (RN-074). */
  private readonly portalTopo = viewChild('portalTopo', { read: ListaEsperaPortalComponent });

  /** Pedido de entrada na fila aguardando conclusão do cadastro (hora + origem do clique). */
  private listaEsperaPendente: { hora: string | null; origem: 'header' | 'passo' } | undefined;

  /**
   * RN-074 — passo 4 em modo lista de espera: o cliente clicou um horário OCUPADO no
   * passo 3 e avançou para a confirmação. Nesse modo o botão confirma a ENTRADA NA FILA
   * (não cria agendamento) e o aviso do passo deixa a condição explícita ao cliente.
   */
  readonly modoListaEspera = signal(false);
  readonly listaEsperaSucesso = signal(false);
  readonly listaEsperaHora = signal<string | null>(null);

  /**
   * RN-074 — botão "Lista de espera" do header: abre o modal de entrada no widget do
   * topo (modo dia — sem horário específico), com a mesma validação de login/cadastro
   * do fluxo do passo. Não navega para a página dedicada.
   */
  abrirListaEsperaHeader(): void {
    void this.solicitarEntradaLista({ hora: null }, 'header');
  }

  /**
   * RN-074 — cliente pediu entrada na fila (header, slot ocupado/dia apagado). Cadastro
   * completo só é exigido quando ele for CONFIRMAR o agendamento; aqui, sem
   * login direciona ao portal-login e sem cadastro completo abre a finalização;
   * concluída a etapa, o modal de confirmação da fila é aberto no widget de origem.
   */
  async solicitarEntradaLista(request: { hora: string | null }, origem: 'header' | 'passo' = 'passo'): Promise<void> {
    const presetBase = {
      dataLista: this.dataSelecionada(),
      servicoId: this.servicoSelecionado()?.id ?? null,
      profissionalId: this.profissionalSelecionado()?.id ?? null,
    };

    let me: { nome?: string; email?: string; celular?: string } | null = null;
    try {
      me = await this.agendamentoPublicoService.getMe();
    } catch {
      me = null;
    }

    if (!me) {
      // Cliente novo (sem sessão): login/cadastro do portal primeiro.
      const slug =
        this.agendamentoPublicoService.estabelecimento() ||
        this.route.snapshot.paramMap.get('estabelecimento') ||
        '';
      if (slug) {
        await this.router.navigate(['/agendamento', slug, 'login']);
      } else {
        await this.router.navigate(['/login']);
      }
      return;
    }

    const partesNome = (me.nome ?? '').trim().split(/\s+/).filter(Boolean);
    const cadastroIncompleto =
      !me.celular || !me.email || partesNome.length < 2;

    if (cadastroIncompleto) {
      this.listaEsperaPendente = { hora: request.hora, origem };
      await this.abrirFinalizacaoCadastro();
      return;
    }

    // RN-074 — slot ocupado escolhido no passo 3: em vez do modal, avança para o
    // passo de confirmação, que deixa explícito que é lista de espera sem garantia
    // de atendimento; só o "Confirmar" ali entra na fila. Demais origens (header,
    // dia apagado/lotado) mantêm o modal de preferências.
    if (origem === 'passo' && request.hora) {
      this.modoListaEspera.set(true);
      this.listaEsperaSucesso.set(false);
      this.listaEsperaHora.set(request.hora);
      this.passo.set(4);
      return;
    }

    this.abrirModalListaNa(origem, {
      ...presetBase,
      ...(request.hora ? { horaJanelaInicio: request.hora } : {}),
    }, request.hora);
  }

  /** Abre o modal no widget de origem do clique (header → topo do wizard; passo 3 → widget do passo). */
  private abrirModalListaNa(
    origem: 'header' | 'passo',
    preset: Partial<EntrarListaEsperaPayload>,
    horaEspecifica: string | null,
  ): void {
    if (origem === 'header') {
      this.portalTopo()?.abrirComPreset(preset, horaEspecifica);
      return;
    }

    this.passoDataHorario()?.abrirModalLista(preset, horaEspecifica);
  }

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
    this.clienteKeepAlive.stop();
    await this.agendamentoPublicoService.logout();
    if (slug) {
      await this.router.navigate(['/agendamento', slug, 'login']);
    } else {
      await this.router.navigate(['/login']);
    }
  }
}

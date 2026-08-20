import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmModalComponent, TmSelectComponent, TmSelectOption, TmTimeComponent, TmTextComponent, TmButtonComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { Agendamento, CORES_STATUS, agendamentoParaDateLocal } from '../../../../../core/models/agenda.model';
import { AgendamentosService } from '../../../../../core/services/agendamentos.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { GestaoUsuariosService } from '../../../../../core/services/gestao-usuarios.service';
import { LanguageService } from '../../../../../core/services/language.service';
import { ThemeService } from '../../../../../core/services/theme.service';
import { TxKey } from '../../../../../core/i18n/i18n.types';

@Component({
  selector: 'app-agenda-modal-dia',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmModalComponent,
    TmSelectComponent,
    TmTimeComponent,
    TmTextComponent,
    TmButtonComponent,
    TranslatePipe,
  ],
  templateUrl: './agenda-modal-dia.component.html',
  styleUrl: './agenda-modal-dia.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaModalDiaComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly agendamentosService = inject(AgendamentosService);
  private readonly authService = inject(AuthService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(TmToastService);
  protected readonly themeService = inject(ThemeService);

  /** Admin pode agendar para qualquer profissional; profissional fica restrito ao próprio id (backend também valida). */
  protected readonly ehAdmin = this.authService.hasAdminRole;

  readonly show = model<boolean>(false);
  readonly dataSelecionada = input<Date | null>(null);
  readonly agendamentos = input<Agendamento[]>([]);

  readonly mudancaAgendamento = output<void>();

  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly exibeForm = signal(false);
  protected readonly exibeDetalhes = signal(false);
  protected readonly agendamentoDetalhe = signal<Agendamento | null>(null);
  protected readonly agendamentoEditando = signal<Agendamento | null>(null);
  protected readonly agendamentoCancelando = signal<Agendamento | null>(null);
  protected readonly showCancelModal = signal(false);
  /** Quando true, os botões de decisão dão lugar à confirmação de recusa (Sim/Não). */
  protected readonly confirmandoRecusa = signal(false);
  protected readonly carregandoHorarios = signal(false);
  protected readonly horaOptions = signal<TmSelectOption<string>[]>([]);

  protected readonly coresStatus: Record<string, string> = {
    ...CORES_STATUS,
    agendado: '#7c3aed',
    pendente: '#7c3aed',
    cancelado: '#6c757d',
  };

  protected readonly servicoOptions = computed<TmSelectOption<string>[]>(() =>
    this.catalogoService
      .servicos()
      .filter((s) => s.status === 'Ativo')
      .map((s) => ({ value: s.id, label: s.nome })),
  );

  /** Profissionais do tenant com perfil Profissional (padrão ProfissionaisComponent), exibindo nome + sobrenome. */
  protected readonly profissionalOptions = computed<TmSelectOption<string>[]>(() =>
    this.gestaoUsuariosService
      .usuarios()
      .filter((u) => u.perfil === 'Profissional' || (u.perfil && u.perfil.includes('Profissional')))
      .map((u) => ({ value: u.id, label: u.sobrenome ? `${u.nome} ${u.sobrenome}` : u.nome })),
  );

  protected readonly statusDecisionOptions: TmSelectOption<string>[] = [
    { value: 'confirmado', label: 'Confirmar' },
    { value: 'nao_compareceu', label: 'Não Compareceu' },
    { value: 'recusado', label: 'Recusar' },
  ];

  /** Status terminal: agendamento recusado não pode mais ter o status alterado. */
  protected readonly statusDecisaoBloqueado = computed(() =>
    this.agendamentoEditando()?.status === 'recusado',
  );

  /** Status que ainda aceitam decisão (recusado é terminal). */
  protected readonly podeDecidir = computed(() => {
    const status = this.agendamentoDetalhe()?.status;
    return status === 'agendado' || status === 'pendente' || status === 'confirmado' || status === 'nao_compareceu';
  });

  /** Verifica se o agendamento já iniciou/passou do horário para exibir a opção "Não compareceu" */
  protected podeMarcarNaoCompareceu(agendamento: Agendamento | null): boolean {
    if (!agendamento) return false;
    if (agendamento.status === 'recusado' || agendamento.status === 'cancelado' || agendamento.status === 'nao_compareceu') {
      return false;
    }
    const inicio = agendamentoParaDateLocal(agendamento.dataInicio);
    const agora = new Date();
    return inicio <= agora;
  }

  /** Permite recusar apenas agendamentos futuros (cujo horário de início ainda não passou) */
  protected podeRecusar(agendamento: Agendamento | null): boolean {
    if (!agendamento) return false;
    if (agendamento.status === 'recusado' || agendamento.status === 'cancelado' || agendamento.status === 'nao_compareceu' || agendamento.status === 'concluido') {
      return false;
    }
    const inicio = agendamentoParaDateLocal(agendamento.dataInicio);
    const agora = new Date();
    return inicio > agora;
  }

  /** Confirmar só é oferecido enquanto o agendamento aguarda decisão. */
  protected readonly podeConfirmar = computed(() => {
    const status = this.agendamentoDetalhe()?.status;
    return status === 'agendado' || status === 'pendente';
  });

  protected readonly form: FormGroup = this.fb.group({
    clienteNome: ['', [Validators.required]],
    clienteTelefone: ['', [Validators.pattern(/^\d{10,13}$/)]],
    profissionalId: ['', [Validators.required]],
    servicoId: ['', [Validators.required]],
    horaInicio: ['', [Validators.required]],
    statusDecisao: ['confirmado'],
    observacoes: [''],
  });

  private readonly subscriptions: { unsubscribe: () => void }[] = [];

  constructor() {
    const profissionalControl = this.form.get('profissionalId');
    const servicoControl = this.form.get('servicoId');
    if (profissionalControl && servicoControl) {
      this.subscriptions.push(
        profissionalControl.valueChanges.subscribe(() => {
          this.carregarHorariosDisponiveis();
        }),
      );
      this.subscriptions.push(
        servicoControl.valueChanges.subscribe(() => {
          this.carregarHorariosDisponiveis();
        }),
      );
    }
  }

  ngOnDestroy(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['show']?.currentValue === true) {
      await Promise.all([this.catalogoService.carregarServicos(), this.gestaoUsuariosService.carregarUsuarios()]);
      this.fecharForm();
      this.fecharDetalhes();
    }
  }

  /** Busca os horários disponíveis do profissional para a data/serviço selecionados e atualiza as opções do campo de horário. */
  protected async carregarHorariosDisponiveis(): Promise<void> {
    const profissionalId = this.form.get('profissionalId')?.value as string | undefined;
    const servicoId = this.form.get('servicoId')?.value as string | undefined;
    const data = this.dataSelecionada();

    if (!profissionalId || !servicoId || !data || this.agendamentoEditando()) {
      return;
    }

    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dataIso = `${data.getFullYear()}-${mes}-${dia}`;

    this.carregandoHorarios.set(true);
    try {
      const horarios = await this.agendamentosService.getHorariosDisponiveis(profissionalId, dataIso, servicoId);
      const disponiveis = horarios.filter((h) => h.disponivel).map((h) => ({ value: h.hora, label: h.hora }));
      this.horaOptions.set(disponiveis);

      const atual = this.form.get('horaInicio')?.value as string | undefined;
      const continuaValido = disponiveis.some((o) => o.value === atual);
      if (!continuaValido) {
        this.form.patchValue({ horaInicio: disponiveis[0]?.value ?? '' }, { emitEvent: false });
      }
    } catch {
      this.horaOptions.set([]);
    } finally {
      this.carregandoHorarios.set(false);
    }
  }

  protected agendamentosDoDia = computed(() => {
    const data = this.dataSelecionada();
    if (!data) return [];
    const diaStr = data.toDateString();
    return this.agendamentos().filter((a) => agendamentoParaDateLocal(a.dataInicio).toDateString() === diaStr);
  });

  protected formatData(data: Date | null): string {
    if (!data) return '';
    const str = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  protected formatHora(data: string | Date): string {
    return agendamentoParaDateLocal(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  protected statusTraduzidoKey(status: string): TxKey {
    const s = status.toUpperCase().replace('-', '_');
    return `AGENDA_MODAL.STATUS.${s}` as TxKey;
  }

  protected abrirNovoForm(): void {
    this.agendamentoEditando.set(null);
    const usuario = this.authService.currentUser();
    const ehAdmin = this.authService.hasAdminRole();
    const profissionalPadrao = ehAdmin
      ? this.profissionalOptions()[0]?.value ?? ''
      : (usuario?.id ?? '');

    this.form.reset({
      clienteNome: '',
      clienteTelefone: '',
      profissionalId: profissionalPadrao,
      servicoId: this.servicoOptions()[0]?.value ?? '',
      horaInicio: '',
      statusDecisao: 'confirmado',
      observacoes: '',
    });
    this.exibeForm.set(true);
    this.carregarHorariosDisponiveis();
  }

  /** Abre a visão de detalhes do agendamento (clique no item da lista). */
  protected abrirDetalhes(agendamento: Agendamento): void {
    this.agendamentoDetalhe.set(agendamento);
    this.exibeForm.set(false);
    this.exibeDetalhes.set(true);
    this.confirmandoRecusa.set(false);
  }

  protected fecharDetalhes(): void {
    this.exibeDetalhes.set(false);
    this.agendamentoDetalhe.set(null);
    this.confirmandoRecusa.set(false);
  }

  /** Aplica a decisão (confirmar/recusar/não compareceu) diretamente dos detalhes, sem abrir o formulário. */
  protected async salvarDecisao(status: 'confirmado' | 'recusado' | 'nao_compareceu'): Promise<void> {
    const agendamento = this.agendamentoDetalhe();
    if (!agendamento || this.salvando()) return;

    if (status === 'recusado' && !this.podeRecusar(agendamento)) {
      this.toastService.error('Não é possível recusar um agendamento cujo horário já passou');
      return;
    }

    this.salvando.set(true);
    try {
      await this.agendamentosService.editarManual(agendamento.id, { status });
      if (status === 'confirmado') {
        this.toastService.success('Agendamento confirmado com sucesso');
      } else if (status === 'nao_compareceu') {
        this.toastService.success('Agendamento marcado como "Não Compareceu"');
      } else {
        this.toastService.success('Agendamento recusado');
      }
      this.fecharDetalhes();
      this.mudancaAgendamento.emit();
    } catch {
      this.toastService.error('Erro ao salvar a decisão');
    } finally {
      this.salvando.set(false);
    }
  }

  protected abrirEdicao(agendamento: Agendamento): void {
    this.exibeDetalhes.set(false);
    this.agendamentoEditando.set(agendamento);
    const hora = this.formatHora(agendamento.dataInicio);

    this.form.reset({
      clienteNome: agendamento.clienteNome,
      clienteTelefone: agendamento.clienteTelefone,
      profissionalId: agendamento.profissionalId,
      servicoId: this.servicoOptions().find((s) => s.label === agendamento.servicoNome)?.value ?? '',
      horaInicio: hora,
      statusDecisao: agendamento.status === 'recusado' ? 'recusado' : 'confirmado',
      observacoes: agendamento.observacoes ?? '',
    });
    this.exibeForm.set(true);
  }

  protected fecharForm(): void {
    this.exibeForm.set(false);
    this.agendamentoEditando.set(null);
  }

  protected async salvarAgendamento(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dataRef = this.dataSelecionada() ?? new Date();
    const val = this.form.value;
    const [hora, minuto] = (val.horaInicio as string).split(':').map(Number);

    // Convenção do projeto: hora local do estabelecimento é enviada crua (sem fuso/UTC).
    const ano = dataRef.getFullYear();
    const mes = String(dataRef.getMonth() + 1).padStart(2, '0');
    const dia = String(dataRef.getDate()).padStart(2, '0');
    const hh = String(hora).padStart(2, '0');
    const mm = String(minuto).padStart(2, '0');
    const dataInicioIso = `${ano}-${mes}-${dia}T${hh}:${mm}:00`;

    this.salvando.set(true);
    try {
      const editando = this.agendamentoEditando();
      if (editando) {
        await this.agendamentosService.editarManual(editando.id, {
          servicoId: val.servicoId,
          dataInicio: dataInicioIso,
          status: val.statusDecisao,
          observacoes: val.observacoes,
        });
        this.toastService.success('Agendamento atualizado com sucesso');
      } else {
        await this.agendamentosService.criarManual({
          clienteNome: val.clienteNome,
          clienteTelefone: val.clienteTelefone,
          profissionalId: val.profissionalId,
          servicoId: val.servicoId,
          dataInicio: dataInicioIso,
          observacoes: val.observacoes,
        });
        this.toastService.success('Agendamento criado com sucesso');
      }

      this.fecharForm();
      this.mudancaAgendamento.emit();
    } catch {
      this.toastService.error('Erro ao salvar agendamento');
    } finally {
      this.salvando.set(false);
    }
  }

  protected confirmarCancelar(agendamento: Agendamento): void {
    this.agendamentoCancelando.set(agendamento);
    this.showCancelModal.set(true);
  }

  protected async executarCancelamento(): Promise<void> {
    const agendamento = this.agendamentoCancelando();
    if (!agendamento) return;

    this.salvando.set(true);
    try {
      await this.agendamentosService.cancelar(agendamento.id, 'Cancelado manualmente via agenda');
      this.toastService.success('Agendamento cancelado com sucesso');
      this.showCancelModal.set(false);
      this.agendamentoCancelando.set(null);
      this.mudancaAgendamento.emit();
    } catch {
      this.toastService.error('Erro ao cancelar agendamento');
    } finally {
      this.salvando.set(false);
    }
  }

  protected fecharModal(): void {
    this.show.set(false);
    this.fecharForm();
  }
}

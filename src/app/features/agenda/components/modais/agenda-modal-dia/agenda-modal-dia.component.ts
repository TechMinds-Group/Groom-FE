import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmModalComponent, TmSelectComponent, TmSelectOption, TmTimeComponent, TmTextComponent, TmButtonComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { Agendamento, CORES_STATUS } from '../../../../../core/models/agenda.model';
import { AgendamentosService } from '../../../../../core/services/agendamentos.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { LanguageService } from '../../../../../core/services/language.service';
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
export class AgendaModalDiaComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly agendamentosService = inject(AgendamentosService);
  private readonly authService = inject(AuthService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(TmToastService);

  readonly show = model<boolean>(false);
  readonly dataSelecionada = input<Date | null>(null);
  readonly agendamentos = input<Agendamento[]>([]);

  readonly mudancaAgendamento = output<void>();

  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly exibeForm = signal(false);
  protected readonly agendamentoEditando = signal<Agendamento | null>(null);
  protected readonly agendamentoCancelando = signal<Agendamento | null>(null);
  protected readonly showCancelModal = signal(false);

  protected readonly coresStatus: Record<string, string> = {
    ...CORES_STATUS,
    cancelado: '#6c757d',
  };

  protected readonly servicoOptions = computed<TmSelectOption<string>[]>(() =>
    this.catalogoService
      .servicos()
      .filter((s) => s.status === 'Ativo')
      .map((s) => ({ value: s.id, label: s.nome })),
  );

  protected readonly statusDecisionOptions: TmSelectOption<string>[] = [
    { value: 'confirmado', label: 'Confirmar' },
    { value: 'recusado', label: 'Recusar' },
  ];

  protected readonly form: FormGroup = this.fb.group({
    clienteNome: ['', [Validators.required]],
    clienteTelefone: ['', [Validators.pattern(/^\d{10,13}$/)]],
    servicoId: ['', [Validators.required]],
    horaInicio: ['09:00', [Validators.required]],
    statusDecisao: ['confirmado'],
    observacoes: [''],
  });

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['show']?.currentValue === true) {
      await this.catalogoService.carregarServicos();
      this.fecharForm();
    }
  }

  protected agendamentosDoDia = computed(() => {
    const data = this.dataSelecionada();
    if (!data) return [];
    const diaStr = data.toDateString();
    return this.agendamentos().filter((a) => new Date(a.dataInicio).toDateString() === diaStr);
  });

  protected formatData(data: Date | null): string {
    if (!data) return '';
    return data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  protected formatHora(data: Date): string {
    return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  protected statusTraduzidoKey(status: string): TxKey {
    const s = status.toUpperCase().replace('-', '_');
    return `AGENDA_MODAL.STATUS.${s}` as TxKey;
  }

  protected abrirNovoForm(): void {
    this.agendamentoEditando.set(null);
    const data = this.dataSelecionada();
    let horaPadrao = '09:00';
    if (data) {
      const h = String(data.getHours()).padStart(2, '0');
      const m = String(data.getMinutes()).padStart(2, '0');
      if (h !== '00' || m !== '00') horaPadrao = `${h}:${m}`;
    }

    this.form.reset({
      clienteNome: '',
      clienteTelefone: '',
      servicoId: this.servicoOptions()[0]?.value ?? '',
      horaInicio: horaPadrao,
      statusDecisao: 'confirmado',
      observacoes: '',
    });
    this.exibeForm.set(true);
  }

  protected abrirEdicao(agendamento: Agendamento): void {
    this.agendamentoEditando.set(agendamento);
    const hora = this.formatHora(agendamento.dataInicio);

    this.form.reset({
      clienteNome: agendamento.clienteNome,
      clienteTelefone: agendamento.clienteTelefone,
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

    const dataInicioDate = new Date(dataRef);
    dataInicioDate.setHours(hora, minuto, 0, 0);
    const dataInicioIso = dataInicioDate.toISOString();

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
        const usuario = this.authService.currentUser();
        await this.agendamentosService.criarManual({
          clienteNome: val.clienteNome,
          clienteTelefone: val.clienteTelefone,
          profissionalId: usuario?.id ?? '',
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

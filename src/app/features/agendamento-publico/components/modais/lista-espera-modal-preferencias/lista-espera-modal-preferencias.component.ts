import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TmModalComponent, TmSelectComponent } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublicoService } from '../../../../../core/services/agendamento-publico.service';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';
import { ProfissionalDisponivel, ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';
import { EntrarListaEsperaPayload } from '../../../../../core/models/lista-espera/lista-espera.model';
import { TemaPublicoService } from '../../../services/tema-publico.service';

/** Valor dos selects quando a preferência não foi escolhida (null no payload). */
const SEM_PREFERENCIA = '';

/**
 * Valida "HH:mm" informado contra a hora atual (fuso UTC-3 — DEC-002):
 * campo opcional, mas quando informado não pode estar no passado.
 */
export function horaJanelaValida(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string;
    if (!valor) {
      return null;
    }
    const [hora, minuto] = valor.split(':').map(Number);
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    return hora * 60 + minuto >= minutosAgora ? null : { horaPassada: true };
  };
}

/**
 * Modal de preferências opcionais para entrar na lista de espera do dia (UI_SPEC §5.14/§6.4):
 * serviço desejado (catálogo ativo), profissional (com "Qualquer profissional" — RN-042)
 * e "a partir de que horas". Todos opcionais; o componente pai executa a entrada (POST).
 */
@Component({
  selector: 'app-lista-espera-modal-preferencias',
  standalone: true,
  imports: [ReactiveFormsModule, TmModalComponent, TmSelectComponent],
  templateUrl: './lista-espera-modal-preferencias.component.html',
  styleUrl: './lista-espera-modal-preferencias.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaEsperaModalPreferenciasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly temaPublico = inject(TemaPublicoService);

  /** Tema escuro ativo na tela pública — repassado ao dropdown dos selects. */
  protected readonly isDark = computed(() => this.temaPublico.tema() === 'dark');

  /**
   * Janela "a partir de que horas" (24h, passo de 30 min) — só exibe horários
   * possíveis: dentro do expediente de HOJE (getHorarioDia) e a partir de agora.
   */
  protected readonly horaOptions = computed(() => {
    const agora = new Date();
    const expediente = this.estabelecimentoService.getHorarioDia(agora.getDay());
    const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();

    const opcoes: { value: string; label: string }[] = [];
    for (let i = 0; i < 48; i++) {
      const hora = Math.floor(i / 2);
      const minuto = i % 2 === 0 ? 0 : 30;
      const minutosDoDia = hora * 60 + minuto;

      // Já passou hoje — impossível.
      if (minutosDoDia < agoraMinutos) {
        continue;
      }
      // Estabelecimento fechado nessa faixa (quando há expediente configurado).
      if (expediente.ativo && (hora < expediente.dayStartHour || hora >= expediente.dayEndHour)) {
        continue;
      }
      const valor = `${String(hora).padStart(2, '0')}:${minuto === 0 ? '00' : '30'}`;
      opcoes.push({ value: valor, label: valor });
    }
    return opcoes;
  });

  readonly show = model<boolean>(false);
  /** Estado do POST no pai — bloqueia reenvio enquanto a entrada é criada. */
  readonly enviando = input(false);

  /**
   * Preferências pré-preenchidas (entrada via horário ocupado clicado — RN-074):
   * aplicadas ao abrir o modal, sobre os campos informados.
   */
  readonly preset = input<Partial<EntrarListaEsperaPayload> | null>(null);

  readonly confirm = output<EntrarListaEsperaPayload>();

  readonly form = this.fb.group({
    servicoId: [SEM_PREFERENCIA],
    profissionalId: [SEM_PREFERENCIA],
    horaJanelaInicio: [SEM_PREFERENCIA, [horaJanelaValida()]],
  });

  private readonly _servicos = signal<ServicoDisponivel[]>([]);
  readonly servicos = this._servicos.asReadonly();

  private readonly _profissionais = signal<ProfissionalDisponivel[]>([]);
  readonly profissionais = this._profissionais.asReadonly();

  readonly carregandoOpcoes = signal(false);

  protected readonly servicoOptions = signal([{ value: SEM_PREFERENCIA, label: 'Qualquer serviço' }]);

  protected readonly profissionalOptions = signal([
    { value: SEM_PREFERENCIA, label: 'Qualquer profissional' },
  ]);

  constructor() {
    // Recarrega as opções do catálogo e reaplica o preset sempre que o modal é aberto
    effect(() => {
      if (this.show()) {
        const preset = this.preset();
        this.form.reset({
          servicoId: preset?.servicoId ?? SEM_PREFERENCIA,
          profissionalId: preset?.profissionalId ?? SEM_PREFERENCIA,
          horaJanelaInicio: preset?.horaJanelaInicio ?? SEM_PREFERENCIA,
        });
        void this.carregarOpcoes();
      }
    });
  }

  /** União dos serviços ativos dos profissionais do portal (não há endpoint público de catálogo único). */
  private async carregarOpcoes(): Promise<void> {
    this.carregandoOpcoes.set(true);
    try {
      const profissionais = await this.agendamentoPublicoService.getProfissionais();
      this._profissionais.set(profissionais);
      const listas = await Promise.all(
        profissionais.map((p) =>
          this.agendamentoPublicoService.getServicosProfissional(p.id).catch(() => [] as ServicoDisponivel[]),
        ),
      );
      const unicos = new Map<string, ServicoDisponivel>();
      for (const lista of listas) {
        for (const servico of lista) {
          if (!unicos.has(servico.id)) {
            unicos.set(servico.id, servico);
          }
        }
      }
      this._servicos.set([...unicos.values()]);
      this.servicoOptions.set([
        { value: SEM_PREFERENCIA, label: 'Qualquer serviço' },
        ...this._servicos().map((s) => ({ value: s.id, label: s.nome })),
      ]);
      this.profissionalOptions.set([
        { value: SEM_PREFERENCIA, label: 'Qualquer profissional' },
        ...profissionais.map((p) => ({ value: p.id, label: p.nome })),
      ]);
    } catch {
      // Falha ao carregar opções: modal permanece com "qualquer" nas duas listas
    } finally {
      this.carregandoOpcoes.set(false);
    }
  }

  protected get horaPassada(): boolean {
    const control = this.form.controls.horaJanelaInicio;
    return control.invalid && (control.touched || control.dirty);
  }

  confirmar(): void {
    const valores = this.form.getRawValue();
    console.log('[ListaEsperaModal] Entrar na lista clicado', {
      valores,
      invalid: this.form.invalid,
      erros: {
        servicoId: this.form.controls.servicoId.errors,
        profissionalId: this.form.controls.profissionalId.errors,
        horaJanelaInicio: this.form.controls.horaJanelaInicio.errors,
      },
      enviando: this.enviando(),
    });
    if (this.enviando()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.warn('[ListaEsperaModal] form inválido — early-return');
      return;
    }
    const { servicoId, profissionalId, horaJanelaInicio } = this.form.getRawValue();
    this.confirm.emit({
      servicoId: servicoId || null,
      profissionalId: profissionalId || null,
      horaJanelaInicio: horaJanelaInicio || null,
    });
  }

  protected fechar(): void {
    this.show.set(false);
  }
}

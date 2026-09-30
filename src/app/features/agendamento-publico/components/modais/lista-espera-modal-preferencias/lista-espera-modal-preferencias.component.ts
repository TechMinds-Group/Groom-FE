import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TmModalComponent, TmSelectComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublicoService } from '../../../../../core/services/agendamento-publico.service';
import { ProfissionalDisponivel, ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';
import { EntrarListaEsperaPayload } from '../../../../../core/models/lista-espera/lista-espera.model';

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
  imports: [ReactiveFormsModule, TmModalComponent, TmSelectComponent, TmTextComponent],
  templateUrl: './lista-espera-modal-preferencias.component.html',
  styleUrl: './lista-espera-modal-preferencias.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaEsperaModalPreferenciasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);

  readonly show = model<boolean>(false);
  /** Estado do POST no pai — bloqueia reenvio enquanto a entrada é criada. */
  readonly enviando = input(false);

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
    // Recarrega as opções do catálogo sempre que o modal é aberto
    effect(() => {
      if (this.show()) {
        this.form.reset({ servicoId: SEM_PREFERENCIA, profissionalId: SEM_PREFERENCIA, horaJanelaInicio: SEM_PREFERENCIA });
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
    if (this.enviando()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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

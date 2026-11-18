import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ModalFormBaseComponent } from '../../../../../shared/modais/modal-form-base/modal-form-base.component';
import { TmTextComponent } from '@techminds-group/tm-angular-lib';
import {
  CriarJornadaEspecialCommand,
  JornadaEspecial,
} from '../../../../../core/models/configuracoes/jornada-especial.model';
import {
  HORA_ABERTURA_PADRAO,
  HORA_FECHAMENTO_PADRAO,
  ProfissionalOpcao,
} from '../../../models/jornada-especial-config.model';

/** Extrai a parte de data (yyyy-MM-dd) de um ISO para o input type="date". */
function extrairData(iso: string): string {
  return iso.split('T')[0] ?? '';
}

/**
 * Validação cruzada que espelha as regras da API (RN-111): período com fim ≥ início
 * e horário de fechamento ≥ abertura.
 */
function validarPeriodoJornada(grupo: AbstractControl): ValidationErrors | null {
  const dataInicio = grupo.get('dataInicio')?.value as string;
  const dataFim = grupo.get('dataFim')?.value as string;
  const horaAbertura = grupo.get('horaAbertura')?.value as string;
  const horaFechamento = grupo.get('horaFechamento')?.value as string;

  if (dataInicio && dataFim && dataFim < dataInicio) {
    return { periodoInvalido: true };
  }
  if (horaAbertura && horaFechamento && horaFechamento < horaAbertura) {
    return { horarioInvalido: true };
  }
  return null;
}

/**
 * Modal de criação/edição de Jornada Especial (RN-147-2).
 * Valida client-side o que a API valida (título obrigatório, fim ≥ início, defaults 08:00–18:00);
 * erros devolvidos pela API (ex.: `Jornada.DataInvalida`) chegam via input `erroApi` e são
 * exibidos sem perder os dados digitados.
 */
@Component({
  selector: 'app-jornada-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalFormBaseComponent, TmTextComponent],
  templateUrl: './jornada-form-modal.component.html',
  styleUrl: './jornada-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JornadaFormModalComponent {
  private readonly fb = inject(FormBuilder);

  /** Estado de exibição (padrão de modal — AGENTS.md §6). */
  readonly show = model<boolean>(false);

  /** Jornada em edição; null indica modo criação. */
  readonly jornada = input<JornadaEspecial | null>(null);

  /** Profissionais disponíveis para o escopo da exceção. */
  readonly profissionais = input<ProfissionalOpcao[]>([]);

  /** Mensagem de erro devolvida pela API (ex.: Jornada.DataInvalida — 422). */
  readonly erroApi = input<string>('');

  readonly salvar = output<CriarJornadaEspecialCommand>();
  readonly cancelar = output<void>();

  readonly form = this.fb.nonNullable.group(
    {
      profissionalId: [''],
      titulo: ['', [Validators.required, Validators.minLength(2)]],
      dataInicio: ['', Validators.required],
      dataFim: ['', Validators.required],
      horaAbertura: [''],
      horaFechamento: [''],
      temIntervalo: [false],
      intervaloInicio: [''],
      intervaloFim: [''],
    },
    { validators: [validarPeriodoJornada] },
  );

  constructor() {
    // Sincroniza o formulário sempre que o modal abre (edição → patch; criação → reset).
    effect(() => {
      if (!this.show()) {
        return;
      }
      const jornada = this.jornada();
      if (jornada) {
        this.form.patchValue({
          profissionalId: jornada.profissionalId ?? '',
          titulo: jornada.titulo,
          dataInicio: extrairData(jornada.dataInicio),
          dataFim: extrairData(jornada.dataFim),
          horaAbertura: jornada.horaAbertura,
          horaFechamento: jornada.horaFechamento,
          temIntervalo: jornada.temIntervalo,
          intervaloInicio: jornada.intervaloInicio ?? '',
          intervaloFim: jornada.intervaloFim ?? '',
        });
      } else {
        this.form.reset();
      }
      this.form.markAsPristine();
      this.form.markAsUntouched();
    });
  }

  protected aoSalvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    this.salvar.emit({
      profissionalId: valor.profissionalId === '' ? null : valor.profissionalId,
      titulo: valor.titulo.trim(),
      dataInicio: valor.dataInicio,
      dataFim: valor.dataFim,
      // Mesma semântica da API: campos vazios recebem os defaults 08:00–18:00 (RN-111).
      horaAbertura: valor.horaAbertura === '' ? HORA_ABERTURA_PADRAO : valor.horaAbertura,
      horaFechamento: valor.horaFechamento === '' ? HORA_FECHAMENTO_PADRAO : valor.horaFechamento,
      temIntervalo: valor.temIntervalo,
      intervaloInicio: valor.temIntervalo && valor.intervaloInicio !== '' ? valor.intervaloInicio : null,
      intervaloFim: valor.temIntervalo && valor.intervaloFim !== '' ? valor.intervaloFim : null,
    });
  }

  protected aoCancelar(): void {
    this.cancelar.emit();
  }
}

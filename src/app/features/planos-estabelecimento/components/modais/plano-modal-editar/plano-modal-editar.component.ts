import { ChangeDetectionStrategy, Component, model, input, output, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmSelectComponent, TmSelectOption } from '@techminds-group/tm-angular-lib';
import { ModalFormBaseComponent } from '../../../../../shared/modais/modal-form-base/modal-form-base.component';
import { ClubeConfig } from '../../../../../core/services/clubes.service';

export interface PlanoEdicaoPayload {
  nome: string;
  preco: number;
  frequencia: string;
  descricao: string;
  recursos: string[];
  status: 'Ativo' | 'Inativo';
}

@Component({
  selector: 'app-plano-modal-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmSelectComponent, ModalFormBaseComponent],
  templateUrl: './plano-modal-editar.component.html',
  styleUrl: './plano-modal-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanoModalEditarComponent {
  private readonly fb = inject(FormBuilder);

  show = model<boolean>(false);
  plano = input<ClubeConfig | null>(null);
  opcoesBeneficios = input<TmSelectOption[]>([]);

  confirm = output<PlanoEdicaoPayload>();
  cancel = output<void>();
  addBeneficio = output<string>();

  protected readonly status = signal<'Ativo' | 'Inativo'>('Ativo');

  protected readonly editForm: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(50)]],
    preco: ['', [Validators.required]],
    frequencia: ['mensal', [Validators.required]],
    descricao: ['', [Validators.maxLength(200)]],
    beneficios: [[], [Validators.required]],
  });

  protected readonly frequenciaOptions: TmSelectOption[] = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'mensal', label: 'Mensal' },
    { value: 'anual', label: 'Anual' },
  ];

  constructor() {
    effect(() => {
      if (this.show()) {
        const p = this.plano();
        if (p) {
          this.editForm.patchValue({
            nome: p.nome,
            preco: p.preco,
            frequencia: p.frequencia,
            descricao: p.descricao,
            beneficios: [...p.recursos],
          });
          this.status.set(p.status as 'Ativo' | 'Inativo');
        } else {
          this.editForm.reset({ nome: '', preco: null, frequencia: 'mensal', descricao: '', beneficios: [] });
          this.status.set('Ativo');
        }
      }
    });
  }

  adicionarNovoBeneficio(term: string): void {
    const val = term.trim();
    if (!val || val.length > 70) return;
    const current = this.editForm.get('beneficios')?.value || [];
    if (!current.includes(val)) {
      this.editForm.patchValue({ beneficios: [...current, val] });
    }
    this.addBeneficio.emit(val);
  }

  salvar(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formVal = this.editForm.value;
    const recursos = formVal.beneficios || [];
    if (recursos.length === 0) return;

    this.confirm.emit({
      nome: formVal.nome,
      preco: this.parseCurrency(formVal.preco),
      frequencia: formVal.frequencia,
      descricao: formVal.descricao,
      recursos,
      status: this.plano() ? this.status() : 'Ativo',
    });
  }

  fechar(): void {
    this.cancel.emit();
  }

  private parseCurrency(value: string | number | null): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = value.replace(/\D/g, '');
    return Number(clean) / 100;
  }
}
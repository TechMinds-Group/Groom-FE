import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  TmModalComponent,
  TmTextComponent,
} from '@techminds-group/tm-angular-lib';
import { ServicoCatalogo } from '../../../../../core/models/catalogo/servico.model';

export interface ServicoEdicaoPayload {
  nome: string;
  preco: number;
  duracao?: number | null;
  status: string;
}

@Component({
  selector: 'app-catalogo-modal-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmModalComponent, TmTextComponent],
  templateUrl: './catalogo-modal-editar.component.html',
  styleUrl: './catalogo-modal-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoModalEditarComponent {
  private readonly fb = inject(FormBuilder);

  readonly show = model<boolean>(false);
  readonly servico = input<ServicoCatalogo | null>(null);

  readonly confirm = output<ServicoEdicaoPayload>();
  readonly cancel = output<void>();

  protected readonly editForm: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    preco: ['', [Validators.required]],
    duracao: [''],
    status: ['Ativo', [Validators.required]],
  });

  constructor() {
    effect(() => {
      if (this.show() && this.servico()) {
        const s = this.servico()!;
        this.editForm.patchValue({
          nome: s.nome,
          preco: s.preco,
          duracao: s.duracao,
          status: s.status,
        });
      }
    });
  }

  protected salvar(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const val = this.editForm.value;
    this.confirm.emit({
      nome: val.nome,
      preco: Number(val.preco),
      duracao: val.duracao ? Number(val.duracao) : null,
      status: val.status,
    });
  }

  protected fechar(): void {
    this.show.set(false);
    this.cancel.emit();
  }
}

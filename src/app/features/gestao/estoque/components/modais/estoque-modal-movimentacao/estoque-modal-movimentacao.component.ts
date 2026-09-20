import { ChangeDetectionStrategy, Component, effect, inject, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmModalComponent, TmSelectComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { ProdutoEstoque, RegistrarMovimentacao, TIPOS_MOVIMENTACAO } from '../../../../../../core/models/estoque/estoque.model';

@Component({
  selector: 'app-estoque-modal-movimentacao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmModalComponent,
    TmSelectComponent,
    TmTextComponent,
  ],
  templateUrl: './estoque-modal-movimentacao.component.html',
  styleUrl: './estoque-modal-movimentacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstoqueModalMovimentacaoComponent {
  private readonly fb = inject(FormBuilder);

  readonly show = model<boolean>(false);
  readonly produto = input<ProdutoEstoque | null>(null);

  readonly confirm = output<RegistrarMovimentacao>();
  readonly cancel = output<void>();

  protected readonly tiposOptions: { value: string; label: string }[] = [...TIPOS_MOVIMENTACAO];

  protected readonly form: FormGroup = this.fb.group({
    tipo: ['Entrada', [Validators.required]],
    quantidade: [1, [Validators.required, Validators.min(1)]],
    motivoObservacao: [''],
  });

  constructor() {
    effect(() => {
      if (this.show()) {
        this.form.reset({
          tipo: 'Entrada',
          quantidade: 1,
          motivoObservacao: '',
        });
      }
    });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const prod = this.produto();
    if (!prod) return;

    const val = this.form.value;
    this.confirm.emit({
      produtoId: prod.id,
      tipo: val.tipo,
      quantidade: Number(val.quantidade),
      motivoObservacao: val.motivoObservacao ? val.motivoObservacao.trim() : '',
    });
  }

  protected fechar(): void {
    this.show.set(false);
    this.cancel.emit();
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmModalComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { Cliente } from '../../../../../core/models/clientes/cliente.model';

export interface ClienteEdicaoPayload {
  nome: string;
  celular: string;
  email?: string;
  cpf?: string;
  dataNascimento?: string;
  observacoes?: string;
  status?: string;
}

@Component({
  selector: 'app-cliente-modal-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmModalComponent, TmTextComponent],
  templateUrl: './cliente-modal-editar.component.html',
  styleUrl: './cliente-modal-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteModalEditarComponent {
  private readonly fb = inject(FormBuilder);

  readonly show = model<boolean>(false);
  readonly cliente = input<Cliente | null>(null);

  readonly confirm = output<ClienteEdicaoPayload>();
  readonly cancel = output<void>();

  protected readonly editForm: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    celular: ['', [Validators.required, Validators.maxLength(15), Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)]],
    email: ['', [Validators.email]],
    cpf: ['', [Validators.maxLength(14)]],
    dataNascimento: [''],
    observacoes: ['', [Validators.maxLength(500)]],
    status: ['Ativo'],
  });

  constructor() {
    effect(() => {
      if (this.show()) {
        const c = this.cliente();
        if (c) {
          this.editForm.patchValue({
            nome: c.nome,
            celular: c.celular,
            email: c.email || '',
            cpf: c.cpf || '',
            dataNascimento: c.dataNascimento || '',
            observacoes: c.observacoes || '',
            status: c.status,
          });
        } else {
          this.editForm.reset({
            nome: '',
            celular: '',
            email: '',
            cpf: '',
            dataNascimento: '',
            observacoes: '',
            status: 'Ativo',
          });
        }
      }
    });
  }

  protected salvar(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.confirm.emit(this.editForm.value as ClienteEdicaoPayload);
  }

  protected fechar(): void {
    this.show.set(false);
    this.cancel.emit();
  }
}
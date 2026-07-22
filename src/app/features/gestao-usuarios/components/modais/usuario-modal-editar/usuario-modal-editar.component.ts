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
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  TmModalComponent,
  TmTextComponent,
  TmSelectComponent,
} from '@techminds-group/tm-angular-lib';
import { Usuario } from '../../../../../core/models/gestao-usuarios/usuario.model';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

export interface UsuarioEdicaoPayload {
  nome: string;
  email: string;
  status: string;
  nivelAcessoId: string;
  secundarioNivelAcessoId?: string | null;
  plano?: string;
}

@Component({
  selector: 'app-usuario-modal-editar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmModalComponent,
    TmTextComponent,
    TmSelectComponent,
    TranslatePipe,
  ],
  templateUrl: './usuario-modal-editar.component.html',
  styleUrl: './usuario-modal-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioModalEditarComponent {
  private readonly fb = inject(FormBuilder);

  readonly show = model<boolean>(false);
  readonly usuario = input<Usuario | null>(null);
  readonly perfilOptions = input<{ value: string; label: string }[]>([]);

  readonly confirm = output<UsuarioEdicaoPayload>();
  readonly cancel = output<void>();

  protected readonly perfisSelecionados = signal<string[]>([]);

  protected readonly editForm: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    status: ['Ativo', [Validators.required]],
    plano: [''],
  });

  constructor() {
    effect(() => {
      if (this.show() && this.usuario()) {
        const u = this.usuario()!;
        const niveis = this.perfilOptions();

        const selectedValues: string[] = [];
        if (u.nivelAcessoId) {
          selectedValues.push(u.nivelAcessoId);
        }
        if (u.secundarioNivelAcessoId) {
          selectedValues.push(u.secundarioNivelAcessoId);
        }

        if (selectedValues.length === 0) {
          const userPerfis = (u.perfil || '')
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);

          for (const pName of userPerfis) {
            const matched = niveis.find((n) => n.label === pName || n.value === pName);
            if (matched && !selectedValues.includes(matched.value)) {
              selectedValues.push(matched.value);
            }
          }
        }

        if (selectedValues.length === 0 && niveis.length > 0) {
          selectedValues.push(niveis[0].value);
        }

        this.perfisSelecionados.set(selectedValues.slice(0, 2));

        this.editForm.patchValue({
          nome: u.nome,
          email: u.email,
          status: u.status,
          plano: u.planoAssinatura || '',
        });
      }
    });
  }

  protected onPerfisChange(val: unknown): void {
    if (Array.isArray(val)) {
      let selected = val as string[];
      if (selected.length > 2) {
        selected = selected.slice(0, 2);
      }
      if (selected.length === 0 && this.perfilOptions().length > 0) {
        selected = [this.perfilOptions()[0].value];
      }
      this.perfisSelecionados.set(selected);
    }
  }

  protected salvar(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const val = this.editForm.value;
    const selected = this.perfisSelecionados();
    const primaryPerfilId = selected.length > 0 ? selected[0] : '';
    const secondaryPerfilId = selected.length > 1 ? selected[1] : null;

    this.confirm.emit({
      nome: val.nome,
      email: val.email,
      status: this.usuario() ? val.status : 'Ativo',
      nivelAcessoId: primaryPerfilId,
      secundarioNivelAcessoId: secondaryPerfilId,
      plano: val.plano,
    });
  }

  protected fechar(): void {
    this.show.set(false);
    this.cancel.emit();
  }
}

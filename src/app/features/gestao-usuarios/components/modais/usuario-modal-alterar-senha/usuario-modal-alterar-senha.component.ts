import { ChangeDetectionStrategy, Component, effect, inject, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmModalComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

export interface UsuarioSenhaPayload {
  currentPassword?: string;
  newPassword: string;
  forgotPassword: boolean;
}

@Component({
  selector: 'app-usuario-modal-alterar-senha',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmModalComponent,
    TmTextComponent,
    TranslatePipe,
  ],
  templateUrl: './usuario-modal-alterar-senha.component.html',
  styleUrl: './usuario-modal-alterar-senha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioModalAlterarSenhaComponent {
  private readonly fb = inject(FormBuilder);

  readonly show = model<boolean>(false);
  readonly isAdmin = input<boolean>(false);

  readonly confirm = output<UsuarioSenhaPayload>();
  readonly cancel = output<void>();

  protected readonly changePasswordForm: FormGroup = this.fb.group({
    currentPassword: [''],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    forgotPassword: [false]
  });

  constructor() {
    effect(() => {
      if (this.show()) {
        this.changePasswordForm.reset({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          forgotPassword: false
        });
        this.updateCurrentPasswordValidators(true);
      }
    });
  }

  protected onForgotPasswordToggle(): void {
    const isForgot = this.changePasswordForm.get('forgotPassword')?.value;
    this.updateCurrentPasswordValidators(!isForgot);
  }

  private updateCurrentPasswordValidators(requireCurrent: boolean): void {
    const control = this.changePasswordForm.get('currentPassword');
    if (requireCurrent) {
      control?.setValidators([Validators.required]);
    } else {
      control?.clearValidators();
    }
    control?.updateValueAndValidity();
  }

  protected salvar(): void {
    const val = this.changePasswordForm.value;

    if (val.newPassword !== val.confirmPassword) {
      this.changePasswordForm.get('confirmPassword')?.setErrors({ mismatch: true });
      return;
    }

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.confirm.emit({
      currentPassword: val.currentPassword,
      newPassword: val.newPassword,
      forgotPassword: !!val.forgotPassword
    });
  }

  protected fechar(): void {
    this.show.set(false);
    this.cancel.emit();
  }
}

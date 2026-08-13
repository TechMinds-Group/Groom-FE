import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmButtonComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { AuthClienteHelperService } from '../../services/auth-cliente-helper.service';

@Component({
  selector: 'app-cadastro-cliente',
  standalone: true,
  imports: [ReactiveFormsModule, TmTextComponent, TmButtonComponent],
  templateUrl: './cadastro-cliente.component.html',
  styleUrl: './cadastro-cliente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastroClienteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly authClienteHelper = inject(AuthClienteHelperService);

  readonly cadastrado = output<void>();
  readonly voltarLogin = output<void>();

  readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    celular: ['', [Validators.required, Validators.minLength(10)]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
    confirmarSenha: ['', [Validators.required]],
    rememberMe: [false],
  });

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, email, celular, senha, confirmarSenha, rememberMe } = this.form.value;
    if (senha !== confirmarSenha) {
      this.errorMessage.set('As senhas não coincidem.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.agendamentoPublicoService.cadastro({
        nome: nome!,
        email: email!,
        senha: senha!,
        celular: celular!,
      }, rememberMe ?? false);
      this.cadastrado.emit();
    } catch (err) {
      this.errorMessage.set(this.extrairMensagemErro(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  private extrairMensagemErro(err: unknown): string {
    const error = err as { error?: { Message?: string; message?: string } };
    return error?.error?.Message ?? error?.error?.message ?? 'Ocorreu um erro ao cadastrar. Tente novamente.';
  }
}
import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { AuthClienteHelperService } from '../../services/auth-cliente-helper.service';
import { GoogleOAuthClienteService } from '../../services/google-oauth-cliente.service';
import { CadastroClienteComponent } from '../cadastro-cliente/cadastro-cliente.component';

@Component({
  selector: 'app-login-cliente',
  standalone: true,
  imports: [ReactiveFormsModule, CadastroClienteComponent],
  templateUrl: './login-cliente.component.html',
  styleUrl: './login-cliente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginClienteComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly authClienteHelper = inject(AuthClienteHelperService);
  private readonly googleOAuthCliente = inject(GoogleOAuthClienteService);

  private readonly googleButton = viewChild.required<ElementRef<HTMLDivElement>>('googleButton');

  readonly aba = signal<'login' | 'cadastro'>('login');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.authClienteHelper.restaurarSessao();
    if (this.agendamentoPublicoService.getToken()) {
      this.router.navigate(['/agendamento', this.agendamentoPublicoService.estabelecimento() ?? '', 'novo']);
      return;
    }

    this.googleOAuthCliente.inicializar(this.googleButton().nativeElement, (idToken) => {
      void this.onLoginGoogle(idToken);
    });
  }

  setAba(aba: 'login' | 'cadastro'): void {
    this.aba.set(aba);
    this.errorMessage.set(null);
  }

  async onLogin(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, senha } = this.form.value;
      const result = await this.agendamentoPublicoService.login({ email: email!, senha: senha! });
      this.authClienteHelper.iniciarSessao(result.cliente, result.token);
      this.router.navigate(['/agendamento', this.agendamentoPublicoService.estabelecimento() ?? '', 'novo']);
    } catch (err) {
      this.errorMessage.set(this.extrairMensagemErro(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  async onLoginGoogle(idToken: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const result = await this.agendamentoPublicoService.loginGoogle(idToken);
      this.authClienteHelper.iniciarSessao(result.cliente, result.token);
      this.router.navigate(['/agendamento', this.agendamentoPublicoService.estabelecimento() ?? '', 'novo']);
    } catch (err) {
      this.errorMessage.set(this.extrairMensagemErro(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  onCadastrado(): void {
    this.router.navigate(['/agendamento', this.agendamentoPublicoService.estabelecimento() ?? '', 'novo']);
  }

  private extrairMensagemErro(err: unknown): string {
    const error = err as { error?: { Message?: string; message?: string } };
    return error?.error?.Message ?? error?.error?.message ?? 'Ocorreu um erro. Tente novamente.';
  }
}

import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TmButtonComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { AuthClienteHelperService } from '../../services/auth-cliente-helper.service';
import { GoogleOAuthClienteService } from '../../services/google-oauth-cliente.service';
import { TemaPublicoService } from '../../services/tema-publico.service';
import { CadastroClienteComponent } from '../cadastro-cliente/cadastro-cliente.component';

@Component({
  selector: 'app-login-cliente',
  standalone: true,
  imports: [ReactiveFormsModule, TmTextComponent, TmButtonComponent, CadastroClienteComponent],
  templateUrl: './login-cliente.component.html',
  styleUrl: './login-cliente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginClienteComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly authClienteHelper = inject(AuthClienteHelperService);
  private readonly googleOAuthCliente = inject(GoogleOAuthClienteService);

  private readonly temaPublico = inject(TemaPublicoService);

  /** Tema ativo (claro/escuro) para exibir o ícone sol/lua correspondente. */
  readonly temaAtivo = this.temaPublico.tema;

  private readonly googleButton = viewChild<ElementRef<HTMLDivElement>>('googleButton');

  readonly aba = signal<'login' | 'cadastro'>('login');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
    rememberMe: [false],
  });

  constructor() {
    effect(() => {
      const container = this.googleButton()?.nativeElement;
      if (container) {
        this.googleOAuthCliente.inicializar(container, (idToken) => {
          void this.onLoginGoogle(idToken);
        });
      }
    });
  }

  ngOnInit(): void {
    this.authClienteHelper.restaurarSessao();
    void this.verificarSessao();
  }

  private async verificarSessao(): Promise<void> {
    const cliente = await this.agendamentoPublicoService.getMe();
    if (cliente) {
      await this.router.navigate(['/agendamento', this.agendamentoPublicoService.estabelecimento() ?? '', 'novo']);
    }
  }

  ngOnDestroy(): void {
    this.temaPublico.restaurarTemaAnterior();
  }

  setAba(aba: 'login' | 'cadastro'): void {
    this.aba.set(aba);
    this.errorMessage.set(null);
  }

  /** Alterna entre tema claro e escuro na tela pública. */
  alternarTema(): void {
    this.temaPublico.alternarTema();
  }

  async onLogin(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const { email, senha, rememberMe } = this.form.value;
      await this.agendamentoPublicoService.login({ email: email!, senha: senha! }, rememberMe ?? false);
      await this.router.navigate(['/agendamento', this.agendamentoPublicoService.estabelecimento() ?? '', 'novo']);
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
      await this.agendamentoPublicoService.loginGoogle(idToken);
      await this.router.navigate(['/agendamento', this.agendamentoPublicoService.estabelecimento() ?? '', 'novo']);
    } catch (err) {
      this.errorMessage.set(this.extrairMensagemErro(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  onCadastrado(): void {
    void this.router.navigate(['/agendamento', this.agendamentoPublicoService.estabelecimento() ?? '', 'novo']);
  }

  private extrairMensagemErro(err: unknown): string {
    const error = err as { error?: { Message?: string; message?: string } };
    return error?.error?.Message ?? error?.error?.message ?? 'Ocorreu um erro. Tente novamente.';
  }
}
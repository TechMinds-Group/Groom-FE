import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TmButtonComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { EstabelecimentoInfo, EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { AuthClienteHelperService } from '../../services/auth-cliente-helper.service';
import { GoogleOAuthClienteService } from '../../services/google-oauth-cliente.service';
import { TemaPublicoService } from '../../services/tema-publico.service';
import { CadastroClienteComponent } from '../cadastro-cliente/cadastro-cliente.component';
import { AppFooterComponent } from '../../../../shared/components/footer/app-footer.component';

@Component({
  selector: 'app-login-cliente',
  standalone: true,
  imports: [ReactiveFormsModule, TmTextComponent, TmButtonComponent, CadastroClienteComponent, AppFooterComponent],
  templateUrl: './login-cliente.component.html',
  styleUrl: './login-cliente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginClienteComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly authClienteHelper = inject(AuthClienteHelperService);
  private readonly googleOAuthCliente = inject(GoogleOAuthClienteService);

  private readonly temaPublico = inject(TemaPublicoService);

  /** Tema ativo (claro/escuro) para exibir o ícone sol/lua correspondente. */
  readonly temaAtivo = this.temaPublico.tema;

  /** Dados da marca/identidade do estabelecimento */
  readonly estabelecimentoInfo = signal<EstabelecimentoInfo | null>(null);

  /** Logo com URL absoluta da API (imagens são servidas em /uploads). */
  readonly logoUrlExibicao = computed(() => this.estabelecimentoService.resolverUrl(this.estabelecimentoInfo()?.logoUrl));

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
    void this.carregarInfoEstabelecimento();
  }

  private getEstabelecimentoSlug(): string {
    const slug =
      this.agendamentoPublicoService.estabelecimento() ||
      this.route.snapshot.paramMap.get('estabelecimento') ||
      this.route.snapshot.parent?.paramMap.get('estabelecimento') ||
      '';
    if (slug) {
      this.agendamentoPublicoService.setEstabelecimento(slug);
    }
    return slug;
  }

  private async carregarInfoEstabelecimento(): Promise<void> {
    const slug = this.getEstabelecimentoSlug();
    if (slug) {
      try {
        const info = await this.estabelecimentoService.carregarInfoPublico(slug);
        this.estabelecimentoInfo.set(info);
      } catch {
        // Fallback gracioso
      }
    }
  }

  private async verificarSessao(): Promise<void> {
    const slug = this.getEstabelecimentoSlug();
    const cliente = await this.agendamentoPublicoService.getMe();
    if (cliente && slug) {
      await this.router.navigate(['/agendamento', slug, 'novo']);
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
      const slug = this.getEstabelecimentoSlug();
      const { email, senha, rememberMe } = this.form.value;
      await this.agendamentoPublicoService.login({ email: email!, senha: senha! }, rememberMe ?? false);
      await this.router.navigate(['/agendamento', slug, 'novo']);
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
      const slug = this.getEstabelecimentoSlug();
      await this.agendamentoPublicoService.loginGoogle(idToken);
      await this.router.navigate(['/agendamento', slug, 'novo']);
    } catch (err) {
      this.errorMessage.set(this.extrairMensagemErro(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  onCadastrado(): void {
    const slug = this.getEstabelecimentoSlug();
    void this.router.navigate(['/agendamento', slug, 'novo']);
  }

  private extrairMensagemErro(err: unknown): string {
    const error = err as { error?: { Message?: string; message?: string } };
    return error?.error?.Message ?? error?.error?.message ?? 'Ocorreu um erro. Tente novamente.';
  }
}
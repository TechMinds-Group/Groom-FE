import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { TmTextComponent } from '@techminds-group/tm-angular-lib';
import { AppFooterComponent } from '../../../../shared/components/footer/app-footer.component';

@Component({
  selector: 'app-sg-login-x7k9p',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmTextComponent,
    AppFooterComponent,
  ],
  templateUrl: './sg-login-x7k9p.component.html',
  styleUrls: ['./sg-login-x7k9p.component.scss'],
})
export class SgLoginX7k9pComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  sgLoginForm = this.fb.group({
    usuario: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [true],
  });

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.sgLoginForm.invalid) {
      this.sgLoginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { usuario, password, rememberMe } = this.sgLoginForm.value;

    this.authService.sgLogin(usuario!, password!, rememberMe!).subscribe({
      next: () => {
        this.isLoading.set(false);
        if (rememberMe) {
          sessionStorage.setItem('sg_login_usuario', usuario!);
        } else {
          sessionStorage.removeItem('sg_login_usuario');
        }
        this.router.navigate(['/sg-estabelecimentos-x7k9p']);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Credenciais de gerenciamento (SG) inválidas ou acesso negado.');
        } else if (err.status === 423) {
          this.errorMessage.set('Conta de gerenciamento bloqueada temporariamente devido a múltiplas tentativas.');
        } else if (err.error && err.error.message) {
          this.errorMessage.set(err.error.message);
        } else {
          this.errorMessage.set('Falha na comunicação com o servidor de gerenciamento SG.');
        }
      },
    });
  }
}

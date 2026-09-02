import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sg-perfil-x7k9p',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent],
  templateUrl: './sg-perfil-x7k9p.component.html',
  styleUrl: './sg-perfil-x7k9p.component.scss'
})
export class SgPerfilX7k9pComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(TmToastService);

  protected salvandoPerfil = signal<boolean>(false);
  protected salvandoSenha = signal<boolean>(false);
  protected usuarioAtual = signal<string>('micheladm');

  protected perfilForm: FormGroup = this.fb.group({
    novoUsuario: ['', [Validators.required, Validators.maxLength(50)]],
    novoEmail: ['', [Validators.email, Validators.maxLength(100)]]
  });

  protected senhaForm: FormGroup = this.fb.group({
    senhaAtual: ['', [Validators.required]],
    novaSenha: ['', [Validators.required, Validators.minLength(6)]],
    confirmarNovaSenha: ['', [Validators.required]]
  });

  ngOnInit(): void {
    const saved = sessionStorage.getItem('sg_login_usuario') || 'micheladm';
    this.usuarioAtual.set(saved);
    this.perfilForm.patchValue({
      novoUsuario: saved,
      novoEmail: `${saved}@fasto.com`
    });
  }

  voltar(): void {
    this.router.navigate(['/sg-estabelecimentos-x7k9p']);
  }

  async salvarPerfil(): Promise<void> {
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.toastService.error('Preencha os campos obrigatórios.', 'Atenção');
      return;
    }

    this.salvandoPerfil.set(true);
    try {
      const raw = this.perfilForm.value;
      const current = this.usuarioAtual();

      await this.authService.sgUpdateProfile(current, raw.novoUsuario, raw.novoEmail).toPromise();

      sessionStorage.setItem('sg_login_usuario', raw.novoUsuario);
      this.usuarioAtual.set(raw.novoUsuario);
      this.toastService.success('Perfil master atualizado com sucesso!', 'Sucesso');
    } catch (err: any) {
      const msg = err?.error?.message || 'Erro ao atualizar perfil master.';
      this.toastService.error(msg, 'Erro');
    } finally {
      this.salvandoPerfil.set(false);
    }
  }

  async alterarSenha(): Promise<void> {
    if (this.senhaForm.invalid) {
      this.senhaForm.markAllAsTouched();
      this.toastService.error('Preencha os campos obrigatórios.', 'Atenção');
      return;
    }

    const { senhaAtual, novaSenha, confirmarNovaSenha } = this.senhaForm.value;

    if (novaSenha !== confirmarNovaSenha) {
      this.toastService.error('A confirmação da senha não confere.', 'Atenção');
      return;
    }

    this.salvandoSenha.set(true);
    try {
      const current = this.usuarioAtual();
      await this.authService.sgChangePassword(current, senhaAtual, novaSenha).toPromise();

      this.senhaForm.reset();
      this.toastService.success('Senha master alterada com sucesso!', 'Sucesso');
    } catch (err: any) {
      const msg = err?.error?.message || 'Erro ao alterar senha master.';
      this.toastService.error(msg, 'Erro');
    } finally {
      this.salvandoSenha.set(false);
    }
  }
}

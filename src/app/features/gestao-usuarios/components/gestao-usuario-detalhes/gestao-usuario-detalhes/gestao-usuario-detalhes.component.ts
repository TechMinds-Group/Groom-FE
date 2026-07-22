import { ChangeDetectionStrategy, Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GestaoUsuariosService } from '../../../../../core/services/gestao-usuarios.service';
import { Usuario } from '../../../../../core/models/gestao-usuarios/usuario.model';
import { AuthService } from '../../../../../core/services/auth.service';
import { GestaoUsuariosHelperService } from '../../../services/gestao-usuarios-helper.service';
import { GestaoUsuarioDetalhesGeralComponent } from '../gestao-usuario-detalhes-geral/gestao-usuario-detalhes-geral.component';
import { GestaoUsuarioDetalhesAcoesComponent } from '../gestao-usuario-detalhes-acoes/gestao-usuario-detalhes-acoes.component';
import {
  UsuarioModalEditarComponent,
  UsuarioEdicaoPayload,
} from '../../modais/usuario-modal-editar/usuario-modal-editar.component';
import {
  UsuarioModalAlterarSenhaComponent,
  UsuarioSenhaPayload,
} from '../../modais/usuario-modal-alterar-senha/usuario-modal-alterar-senha.component';
import { UsuarioModalExcluirComponent } from '../../modais/usuario-modal-excluir/usuario-modal-excluir.component';

import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-gestao-usuario-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    GestaoUsuarioDetalhesGeralComponent,
    GestaoUsuarioDetalhesAcoesComponent,
    UsuarioModalEditarComponent,
    UsuarioModalAlterarSenhaComponent,
    UsuarioModalExcluirComponent,
    TranslatePipe,
  ],
  templateUrl: './gestao-usuario-detalhes.component.html',
  styleUrl: './gestao-usuario-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GestaoUsuariosHelperService],
})
export class GestaoUsuarioDetalhesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly authService = inject(AuthService);

  protected readonly id = signal<string | null>(null);
  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly perfilOptions = signal<{ value: string; label: string }[]>([]);

  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly currentUserId = this.authService.currentUserId;

  protected readonly showEditModal = signal<boolean>(false);
  protected readonly showChangePasswordModal = signal<boolean>(false);
  protected readonly showDeleteConfirmModal = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    const paramId = this.route.snapshot.paramMap.get('id');
    if (paramId) {
      this.id.set(paramId);
      await this.carregarDadosUsuario(paramId);
    }
    const niveis = await this.gestaoUsuariosService.carregarNiveis();
    this.perfilOptions.set(niveis.map((n) => ({ value: n.id, label: n.nome })));
  }

  private async carregarDadosUsuario(userId: string): Promise<void> {
    if (this.gestaoUsuariosService.usuarios().length === 0) {
      await this.gestaoUsuariosService.carregarUsuarios();
    }
    const user = this.gestaoUsuariosService.usuarios().find((u) => u.id === userId);
    if (user) {
      this.usuario.set(user);
    }
  }

  voltar(): void {
    this.router.navigate(['/gestao/gestao-usuarios']);
  }

  abrirEdicao(): void {
    this.showEditModal.set(true);
  }

  async salvarEdicao(payload: UsuarioEdicaoPayload): Promise<void> {
    if (!this.id()) return;

    await this.gestaoUsuariosService.atualizar(this.id()!, payload);
    this.showEditModal.set(false);
    await this.carregarDadosUsuario(this.id()!);
  }

  abrirAlterarSenha(): void {
    this.showChangePasswordModal.set(false);
    setTimeout(() => this.showChangePasswordModal.set(true), 0);
  }

  async salvarSenha(payload: UsuarioSenhaPayload): Promise<void> {
    if (!this.id()) return;

    if (payload.forgotPassword && this.isAdmin()) {
      await this.gestaoUsuariosService.resetarSenha(this.id()!);
    } else {
      await this.gestaoUsuariosService.alterarSenha(this.id()!, {
        oldPassword: payload.currentPassword || '',
        newPassword: payload.newPassword,
        forgotPassword: payload.forgotPassword,
      });
    }

    this.showChangePasswordModal.set(false);
  }

  excluir(): void {
    this.showDeleteConfirmModal.set(true);
  }

  async confirmarExcluir(): Promise<void> {
    if (!this.id()) return;
    await this.gestaoUsuariosService.remover(this.id()!);
    this.showDeleteConfirmModal.set(false);
    this.voltar();
  }
}
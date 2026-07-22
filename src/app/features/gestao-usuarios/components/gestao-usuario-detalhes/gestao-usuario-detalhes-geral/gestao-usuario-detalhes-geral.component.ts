import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../../../../core/models/gestao-usuarios/usuario.model';
import { PerfilBadgePipe } from '../../../pipes/perfil-badge.pipe';
import { StatusBadgePipe } from '../../../pipes/status-badge.pipe';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-gestao-usuario-detalhes-geral',
  standalone: true,
  imports: [CommonModule, PerfilBadgePipe, StatusBadgePipe, TranslatePipe],
  templateUrl: './gestao-usuario-detalhes-geral.component.html',
  styleUrl: './gestao-usuario-detalhes-geral.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestaoUsuarioDetalhesGeralComponent {
  usuario = input.required<Usuario>();
}
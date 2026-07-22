import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../../../../core/models/gestao-usuarios/usuario.model';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-gestao-usuario-detalhes-acoes',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './gestao-usuario-detalhes-acoes.component.html',
  styleUrl: './gestao-usuario-detalhes-acoes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestaoUsuarioDetalhesAcoesComponent {
  usuario = input.required<Usuario>();
  isAdmin = input<boolean>(false);
  currentUserId = input<string | null>(null);

  editar = output<void>();
  alterarSenha = output<void>();
  excluir = output<void>();
}
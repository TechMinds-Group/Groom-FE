import { ChangeDetectionStrategy, Component, inject, input, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { Usuario } from '../../../../../core/models/gestao-usuarios/usuario.model';
import { PerfilBadgePipe } from '../../../pipes/perfil-badge.pipe';
import { StatusBadgePipe } from '../../../pipes/status-badge.pipe';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { GestaoUsuariosService } from '../../../../../core/services/gestao-usuarios.service';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { ClubesService } from '../../../../../core/services/clubes.service';

@Component({
  selector: 'app-gestao-usuario-detalhes-geral',
  standalone: true,
  imports: [CommonModule, PerfilBadgePipe, StatusBadgePipe, TranslatePipe],
  templateUrl: './gestao-usuario-detalhes-geral.component.html',
  styleUrl: './gestao-usuario-detalhes-geral.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestaoUsuarioDetalhesGeralComponent {
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly clubesService = inject(ClubesService);

  usuario = input.required<Usuario>();

  protected readonly servicosAtuacao = signal<string[]>([]);
  protected readonly planosAtuacao = signal<string[]>([]);

  constructor() {
    effect(() => {
      const u = this.usuario();
      if (u && u.id) {
        this.carregarAtuacao(u.id);
      }
    });
  }

  protected getNomeCompleto(user: Usuario): string {
    if (user.sobrenome && user.sobrenome.trim()) {
      return `${user.nome} ${user.sobrenome}`;
    }
    return user.nome;
  }

  protected getPrimeiroNome(user: Usuario): string {
    if (user.sobrenome && user.sobrenome.trim()) {
      return user.nome;
    }
    const partes = (user.nome || '').trim().split(/\s+/);
    return partes[0] || user.nome;
  }

  protected getSobrenome(user: Usuario): string {
    if (user.sobrenome && user.sobrenome.trim()) {
      return user.sobrenome;
    }
    const partes = (user.nome || '').trim().split(/\s+/);
    return partes.length > 1 ? partes.slice(1).join(' ') : '';
  }

  private async carregarAtuacao(id: string): Promise<void> {
    try {
      const atuacao = await this.gestaoUsuariosService.carregarAtuacao(id);

      const [servicos, planos] = await Promise.all([
        this.catalogoService.servicos().length > 0
          ? Promise.resolve(this.catalogoService.servicos())
          : this.catalogoService.carregarServicos().then(() => this.catalogoService.servicos()),
        firstValueFrom(this.clubesService.carregarClubes()),
      ]);

      this.servicosAtuacao.set(
        atuacao.servicoIds
          .map((servicoId) => servicos.find((s) => s.id === servicoId)?.nome)
          .filter((nome): nome is string => !!nome),
      );
      this.planosAtuacao.set(
        atuacao.planoIds
          .map((planoId) => planos.find((p) => p.id === planoId)?.nome)
          .filter((nome): nome is string => !!nome),
      );
    } catch {
      this.servicosAtuacao.set([]);
      this.planosAtuacao.set([]);
    }
  }
}
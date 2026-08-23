import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { GestaoUsuariosService } from '../../../../../core/services/gestao-usuarios.service';
import { AgendamentosService } from '../../../../../core/services/agendamentos.service';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { ClubesService } from '../../../../../core/services/clubes.service';
import { Usuario } from '../../../../../core/models/gestao-usuarios/usuario.model';
import { Agendamento } from '../../../../../core/models/agenda.model';
import { PerfilBadgePipe } from '../../../../gestao-usuarios/pipes/perfil-badge.pipe';
import { StatusBadgePipe } from '../../../../gestao-usuarios/pipes/status-badge.pipe';
import { GestaoUsuariosHelperService } from '../../../../gestao-usuarios/services/gestao-usuarios-helper.service';

import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';
import { DisponibilidadeComponent } from '../../../../disponibilidade/components/disponibilidade/disponibilidade.component';

@Component({
  selector: 'app-profissional-detalhes',
  standalone: true,
  imports: [CommonModule, PerfilBadgePipe, StatusBadgePipe, DisponibilidadeComponent],
  templateUrl: './profissional-detalhes.component.html',
  styleUrl: './profissional-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GestaoUsuariosHelperService],
})
export class ProfissionalDetalhesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly agendamentosService = inject(AgendamentosService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly clubesService = inject(ClubesService);
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);

  protected readonly profissional = signal<Usuario | null>(null);
  protected readonly agendamentosProfissional = signal<Agendamento[]>([]);
  protected readonly servicosAtuacao = signal<string[]>([]);
  protected readonly planosAtuacao = signal<string[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregarDados(id);
    }
  }

  voltar(): void {
    this.router.navigate(['/gestao/profissionais']);
  }

  abrirEdicao(): void {
    const p = this.profissional();
    if (p) {
      this.router.navigate(['/gestao/profissionais', p.id, 'editar']);
    }
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

  private async carregarDados(id: string): Promise<void> {
    try {
      await this.gestaoUsuariosService.carregarUsuarios();
      const user = this.gestaoUsuariosService.usuarios().find((u) => u.id === id);
      if (!user) {
        this.toastService.error('Profissional não encontrado.', 'Erro');
        this.voltar();
        return;
      }
      this.profissional.set(user);

      await Promise.all([
        this.carregarAgendamentos(id),
        this.carregarAtuacao(id),
      ]);
    } catch (err) {
      console.error('Erro ao carregar detalhes do profissional', err);
      if (!this.profissional()) {
        this.voltar();
      }
    }
  }

  private async carregarAgendamentos(id: string): Promise<void> {
    try {
      await this.agendamentosService.carregarAgendamentos(id);
      this.agendamentosProfissional.set(this.agendamentosService.agendamentos());
    } catch (err) {
      console.error('Erro ao carregar agendamentos do profissional', err);
      this.agendamentosProfissional.set([]);
    }
  }

  /** Carrega os vínculos de atuação (serviços do catálogo e planos) e resolve os nomes. */
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
    } catch (err) {
      console.error('Erro ao carregar atuação do profissional', err);
      this.servicosAtuacao.set([]);
      this.planosAtuacao.set([]);
    }
  }
}

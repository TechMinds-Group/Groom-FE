import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TmTableComponent, TableColumn } from '@techminds-group/tm-angular-lib';
import { GestaoUsuariosService } from '../../../../../core/services/gestao-usuarios.service';
import { Usuario } from '../../../../../core/models/gestao-usuarios/usuario.model';
import { GestaoUsuariosHelperService } from '../../../../gestao-usuarios/services/gestao-usuarios-helper.service';
import { PerfilBadgePipe } from '../../../../gestao-usuarios/pipes/perfil-badge.pipe';
import { StatusBadgePipe } from '../../../../gestao-usuarios/pipes/status-badge.pipe';
import { LanguageService } from '../../../../../core/services/language.service';

import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-profissionais',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
    PerfilBadgePipe,
    StatusBadgePipe,
  ],
  templateUrl: './profissionais.component.html',
  styleUrl: './profissionais.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GestaoUsuariosHelperService],
})
export class ProfissionaisComponent implements OnInit, AfterViewInit {
  protected readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly languageService = inject(LanguageService);

  @ViewChild('usuarioTemplate', { static: true }) usuarioTemplate!: TemplateRef<{
    $implicit: Usuario;
  }>;
  @ViewChild('perfilTemplate', { static: true }) perfilTemplate!: TemplateRef<{
    $implicit: Usuario;
  }>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<{
    $implicit: Usuario;
  }>;

  private readonly templatesReady = signal(false);

  // Filtra apenas usuários que possuem nível de acesso / perfil "Profissional"
  // Administrador vê todos; Profissional não-admin vê apenas a si mesmo.
  protected readonly profissionais = computed(() => {
    const todos = this.gestaoUsuariosService.usuarios().filter((u) =>
      u.perfil === 'Profissional' || (u.perfil && u.perfil.includes('Profissional'))
    );

    if (this.authService.hasAdminRole()) {
      return todos;
    }

    const currentUserId = this.authService.currentUserId();
    return todos.filter((u) => u.id === currentUserId);
  });

  protected readonly cols = computed<TableColumn<Usuario>[]>(() => {
    this.languageService.currentLang();
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: this.languageService.translate('USUARIOS.COLUMNS.USER'), template: this.usuarioTemplate, width: '40%' },
      { header: this.languageService.translate('USUARIOS.COLUMNS.PROFILE'), template: this.perfilTemplate, width: '35%' },
      { header: this.languageService.translate('USUARIOS.COLUMNS.STATUS'), template: this.statusTemplate, width: '25%' },
    ];
  });

  protected readonly tamanhoPagina = signal<number>(5);

  async ngOnInit(): Promise<void> {
    await this.gestaoUsuariosService.carregarUsuarios();
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  verDetalhes(user: Usuario): void {
    this.router.navigate(['/gestao/profissionais', user.id]);
  }
}

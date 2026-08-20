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
import { LanguageService } from '../../../../core/services/language.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { Usuario } from '../../../../core/models/gestao-usuarios/usuario.model';
import { AuthService } from '../../../../core/services/auth.service';
import { GestaoUsuariosHelperService } from '../../services/gestao-usuarios-helper.service';
import { PerfilBadgePipe } from '../../pipes/perfil-badge.pipe';
import { StatusBadgePipe } from '../../pipes/status-badge.pipe';

@Component({
  selector: 'app-gestao-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
    PerfilBadgePipe,
    StatusBadgePipe,
    TranslatePipe,
  ],
  templateUrl: './gestao-usuarios.component.html',
  styleUrl: './gestao-usuarios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GestaoUsuariosHelperService],
})
export class GestaoUsuariosComponent implements OnInit, AfterViewInit {
  protected readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly languageService = inject(LanguageService);

  protected readonly isAdmin = this.authService.isAdmin;

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

  protected readonly cols = computed<TableColumn<Usuario>[]>(() => {
    // Read currentLang to register dependency
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

  abrirNovo(): void {
    this.router.navigate(['/gestao/gestao-usuarios/novo']);
  }

  verDetalhes(user: Usuario): void {
    this.router.navigate(['/gestao/gestao-usuarios', user.id]);
  }
}

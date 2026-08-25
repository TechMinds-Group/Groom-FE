import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableColumn, TmTableComponent } from '@techminds-group/tm-angular-lib';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { Usuario } from '../../../../core/models/gestao-usuarios/usuario.model';
import { AuthService } from '../../../../core/services/auth.service';
import { PerfilBadgePipe } from '../../pipes/perfil-badge.pipe';
import { StatusBadgePipe } from '../../pipes/status-badge.pipe';
import { GestaoUsuariosHelperService } from '../../services/gestao-usuarios-helper.service';

@Component({
  selector: 'app-gestao-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
    PerfilBadgePipe,
    StatusBadgePipe,
  ],
  templateUrl: './gestao-usuarios.component.html',
  styleUrl: './gestao-usuarios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GestaoUsuariosHelperService],
})
export class GestaoUsuariosComponent implements OnInit, AfterViewInit {
  protected readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  protected readonly helper = inject(GestaoUsuariosHelperService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isAdmin = this.authService.isAdmin;

  @ViewChild('usuarioTemplate', { static: true })
  usuarioTemplate!: TemplateRef<{ $implicit: Usuario }>;

  @ViewChild('celularTemplate', { static: true })
  celularTemplate!: TemplateRef<{ $implicit: Usuario }>;

  @ViewChild('perfilTemplate', { static: true })
  perfilTemplate!: TemplateRef<{ $implicit: Usuario }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: Usuario }>;

  private readonly templatesReady = signal(false);
  protected readonly tamanhoPagina = signal<number>(5);

  protected readonly cols = computed<TableColumn<Usuario>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Usuário', template: this.usuarioTemplate, width: '35%' },
      { header: 'Celular', template: this.celularTemplate, width: '30%' },
      { header: 'Perfil', template: this.perfilTemplate, width: '20%' },
      { header: 'Status', template: this.statusTemplate, width: '15%' },
    ];
  });

  async ngOnInit(): Promise<void> {
    await this.gestaoUsuariosService.carregarUsuarios();
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  verDetalhes(item: Usuario): void {
    this.router.navigate(['/gestao/gestao-usuarios', item.id]);
  }

  abrirNovo(): void {
    this.router.navigate(['/gestao/gestao-usuarios/novo']);
  }
}

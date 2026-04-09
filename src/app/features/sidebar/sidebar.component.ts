import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmSidebarComponent, MenuItem, SidebarUser } from '@techminds-group/tm-angular-lib';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, TmSidebarComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  public themeService = inject(ThemeService);
  protected isCollapsed = signal(false);
  protected avatarColor = '0D8ABC';

  protected readonly menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: 'fas fa-th-large', route: '/' },
    { 
      label: 'Agenda', 
      icon: 'fas fa-calendar-alt',
      subItems: [
        { label: 'Calendário', icon: 'fas fa-calendar-day', route: '/agenda/calendario' },
        { label: 'Solicitações', icon: 'fas fa-clipboard-list', route: '/agenda/solicitacoes' },
      ]
    },
    { 
      label: 'Meu Link', 
      icon: 'fas fa-link',
      subItems: [
        { label: 'Divulgação', icon: 'fas fa-share-alt', route: '/meu-link/divulgacao' },
        { label: 'QR Code', icon: 'fas fa-qrcode', route: '/meu-link/qrcode' },
      ]
    },
    { label: 'Clientes', icon: 'fas fa-user-friends', route: '/clientes' },
    { label: 'Espera', icon: 'fas fa-clock', route: '/espera' },
    { 
      label: 'Gestão', 
      icon: 'fas fa-users-cog',
      subItems: [
        { label: 'Equipe', icon: 'fas fa-user-tie', route: '/gestao/profissionais' },
        { label: 'Serviços', icon: 'fas fa-concierge-bell', route: '/gestao/servicos' },
      ]
    },
    { 
      label: 'Ajustes', 
      icon: 'fas fa-cog',
      subItems: [
        { label: 'Geral', icon: 'fas fa-id-card', route: '/configuracoes/geral' },
        { label: 'Operacional', icon: 'fas fa-tools', route: '/configuracoes/operacional' },
        { label: 'Estética', icon: 'fas fa-palette', route: '/configuracoes/estetica' },
      ]
    },
  ];

  protected readonly currentUser: SidebarUser = {
    nome: 'Michel Admin',
    role: 'Administrador',
    email: 'michel@groom.com.br',
  };

  @Output() logout = new EventEmitter<void>();
  @Output() themeToggle = new EventEmitter<void>();

  handleLogout(): void {
    this.logout.emit();
  }

  handleToggleCollapse(collapsed: boolean): void {
    this.isCollapsed.set(collapsed);
  }

  handleThemeToggle(): void {
    this.themeService.toggleTheme();
  }

  handleItemClick(item: MenuItem): void {
    console.log('Item clicked:', item);
  }
}

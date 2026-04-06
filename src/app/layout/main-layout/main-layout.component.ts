import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuItem, SidebarUser, TmSidebarComponent } from '@techminds-group/tm-angular-lib';

import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, TmSidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  public themeService = inject(ThemeService);

  get avatarColor(): string {
    return this.themeService.isDarkMode() ? 'ffc107' : '795548';
  }

  isCollapsed = signal(false);

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'bi-grid-1x2-fill',
      route: '/dashboard',
    },
    {
      label: 'Agendamentos',
      icon: 'bi-calendar-event',
      route: '/appointments',
    },
    {
      label: 'Clientes',
      icon: 'bi-people-fill',
      route: '/clients',
    },
    {
      label: 'Serviços',
      icon: 'bi-scissors',
      route: '/services',
    },
    {
      label: 'Configurações',
      icon: 'bi-gear-fill',
      subItems: [
        {
          label: 'Geral',
          icon: 'bi-sliders',
          route: '/settings/general',
        },
        {
          label: 'Perfil',
          icon: 'bi-person-badge',
          route: '/settings/profile',
        },
      ],
    },
  ];

  currentUser: SidebarUser = {
    nome: 'Michel Admin',
    role: 'Administrador',
    email: 'michel@groom.com',
    avatarUrl: 'https://ui-avatars.com/api/?name=Michel+Admin&background=0D8ABC&color=fff',
  };

  handleLogout() {
    console.log('Logout clicked');
    // Implement logout logic here
  }

  handleToggleCollapse(collapsed: boolean) {
    this.isCollapsed.set(collapsed);
  }

  handleThemeToggle() {
    this.themeService.toggleTheme();
  }

  handleItemClick(item: MenuItem) {
    console.log('Menu item clicked:', item.label);
  }
}

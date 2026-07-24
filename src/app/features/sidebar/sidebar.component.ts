import { ChangeDetectionStrategy, Component, output, signal, inject, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmSidebarComponent, MenuItem, ProfileMenuItem, SidebarUser } from '@techminds-group/tm-angular-lib';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { ALL_SIDEBAR_MENU_ITEMS, VISIBLE_SIDEBAR_MENUS, PROFILE_MENU_ITEMS } from '../../core/config/menu.config';
import { SidebarModalIdiomaComponent } from './components/modais/sidebar-modal-idioma/sidebar-modal-idioma.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, TmSidebarComponent, SidebarModalIdiomaComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  protected isCollapsed = signal(false);
  protected avatarColor = signal('0D8ABC');
  protected showIdiomaModal = signal(false);
  @ViewChild(TmSidebarComponent) sidebar!: TmSidebarComponent;

  protected readonly menuItems = computed<MenuItem[]>(() => {
    return ALL_SIDEBAR_MENU_ITEMS.filter(item =>
      VISIBLE_SIDEBAR_MENUS.includes(item.label)
    );
  });

  protected readonly profileMenuItems = computed<ProfileMenuItem[]>(() => {
    return PROFILE_MENU_ITEMS;
  });

  protected readonly currentUser = computed<SidebarUser>(() => {
    const user = this.authService.currentUser();
    if (!user) {
      return {
        nome: 'Usuário',
        role: 'Profissional',
        email: ''
      };
    }
    return {
      nome: user.nome,
      role: user.role || 'Usuário',
      email: user.email
    };
  });

  logout = output<void>();
  themeToggle = output<void>();

  handleLogout(): void {
    this.logout.emit();
  }

  handleToggleCollapse(collapsed: boolean): void {
    this.isCollapsed.set(collapsed);
  }

  handleThemeToggle(): void {
    this.themeService.toggleTheme();
    this.themeToggle.emit();
    this.sidebar.isProfileOpen.set(false);
  }

  handleLanguageChange(_langCode: string): void {
    this.showIdiomaModal.set(true);
    this.sidebar.isProfileOpen.set(false);
  }

  handleItemClick(item: MenuItem): void {
    console.log('Item clicked:', item);
  }
}

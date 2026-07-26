import { ChangeDetectionStrategy, Component, effect, inject, Renderer2, signal, computed } from '@angular/core';
import { SidebarModalIdiomaComponent } from '../../features/sidebar/components/modais/sidebar-modal-idioma/sidebar-modal-idioma.component';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../features/sidebar/sidebar.component';
import { ThemeService } from '../../core/services/theme.service';
import { TmBottomNavComponent, MenuItem } from '@techminds-group/tm-angular-lib';
import { ALL_SIDEBAR_MENU_ITEMS, VISIBLE_SIDEBAR_MENUS, PROFILE_MENU_ITEMS } from '../../core/config/menu.config';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, SidebarComponent, TmBottomNavComponent, SidebarModalIdiomaComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private router = inject(Router);
  protected showIdiomaModal = signal(false);
  protected sidebarCollapsed = signal(false);

  // --- Mobile Menu Configuration dynamically computed from the central menu.config ---
  protected readonly mobileMenuItems = computed<MenuItem[]>(() => {
    const sidebarItems = ALL_SIDEBAR_MENU_ITEMS.filter(item =>
      VISIBLE_SIDEBAR_MENUS.includes(item.label)
    );
    const profileSubItems: MenuItem[] = PROFILE_MENU_ITEMS
      .filter(p => !p.hidden)
      .map(p => ({ label: p.label, icon: p.icon, route: p.route }) as MenuItem);
    profileSubItems.push({ label: 'Versão', icon: 'fas fa-tag', route: '/guia' });
    profileSubItems.push({ label: 'Sair', icon: 'fas fa-right-from-bracket' });
    return [
      ...sidebarItems,
      { label: 'Perfil', icon: 'fas fa-user', subItems: profileSubItems },
    ];
  });

  handleThemeToggle(): void {
  }

  protected handleMobileItemClick(item: MenuItem): void {
    if (item.label === 'Modo de Tela') {
      this.themeService.toggleTheme();
    } else if (item.label === 'Idioma') {
      this.showIdiomaModal.set(true);
    } else if (item.label === 'Sair') {
      this.handleLogout();
    }
  }

  handleLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']) // Redirect even on error to clear local state
    });
  }
}

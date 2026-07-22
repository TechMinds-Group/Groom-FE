import { ChangeDetectionStrategy, Component, effect, inject, Renderer2, signal, computed } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../features/sidebar/sidebar.component';
import { ThemeService } from '../../core/services/theme.service';
import { TmBottomNavComponent, MenuItem } from '@techminds-group/tm-angular-lib';
import { ALL_SIDEBAR_MENU_ITEMS, VISIBLE_SIDEBAR_MENUS } from '../../core/config/menu.config';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TmBottomNavComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // --- Mobile Menu Configuration dynamically computed from the central menu.config ---
  protected readonly mobileMenuItems = computed<MenuItem[]>(() => {
    return ALL_SIDEBAR_MENU_ITEMS.filter(item =>
      VISIBLE_SIDEBAR_MENUS.includes(item.label)
    );
  });

  handleThemeToggle(): void {
    // Theme toggle is handled directly by the SidebarComponent/ThemeService.
    // We can use this event for layout-specific reactions if needed in the future.
  }

  handleLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']) // Redirect even on error to clear local state
    });
  }
}

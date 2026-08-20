import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarModalIdiomaComponent } from '../../features/sidebar/components/modais/sidebar-modal-idioma/sidebar-modal-idioma.component';
import { SidebarComponent } from '../../features/sidebar/sidebar.component';
import { ThemeService } from '../../core/services/theme.service';
import { AppFooterComponent } from '../../shared/components/footer/app-footer.component';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    SidebarComponent,
    SidebarModalIdiomaComponent,
    AppFooterComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  protected showIdiomaModal = signal(false);
  protected sidebarCollapsed = signal(false);
  protected mobileDrawerOpen = signal(false);

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.mobileDrawerOpen.set(false);
    });
  }

  toggleMobileDrawer(): void {
    this.mobileDrawerOpen.update((v) => !v);
  }

  closeMobileDrawer(): void {
    this.mobileDrawerOpen.set(false);
  }

  handleThemeToggle(): void {
    this.themeService.toggleTheme();
  }

  handleLogout(): void {
    this.mobileDrawerOpen.set(false);
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}

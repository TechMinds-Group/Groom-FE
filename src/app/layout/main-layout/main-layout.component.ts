import { ChangeDetectionStrategy, Component, effect, inject, Renderer2, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../features/sidebar/sidebar.component';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private themeService = inject(ThemeService);

  handleThemeToggle(): void {
    this.themeService.toggleTheme();
  }

  handleLogout(): void {
    console.log('Logout from MainLayoutComponent');
  }
}

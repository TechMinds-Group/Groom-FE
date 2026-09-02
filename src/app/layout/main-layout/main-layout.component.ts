import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';
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
    TmModalComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit {
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  protected showIdiomaModal = signal(false);
  protected sidebarCollapsed = signal(false);
  protected mobileDrawerOpen = signal(false);

  // Modal de Aviso de Assinatura (Configurado no SG)
  protected showAvisoModal = signal(false);
  protected avisoModalData = signal<any | null>(null);
  protected bloqueioTotal = signal(false);

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: any) => {
      this.mobileDrawerOpen.set(false);
      // Se a conta estiver com bloqueio total, força permanência na tela de assinatura
      if (this.bloqueioTotal() && !event.url.includes('/assinatura') && !event.url.includes('/sg-')) {
        this.router.navigate(['/assinatura']);
      }
    });
  }

  ngOnInit(): void {
    this.verificarAvisoAssinatura();
  }

  private verificarAvisoAssinatura(): void {
    if (this.router.url.includes('/sg-')) {
      return;
    }

    this.authService.getAvisoAssinaturaStatus().subscribe({
      next: (res) => {
        if (!res) return;

        // Trata Bloqueio Total após exceder dias de tolerância
        if (res.bloqueioTotal) {
          this.bloqueioTotal.set(true);
          this.avisoModalData.set(res);
          this.showAvisoModal.set(true);
          if (!this.router.url.includes('/assinatura')) {
            this.router.navigate(['/assinatura']);
          }
          return;
        }

        if (!res.exibirModal || !res.slotId) {
          return;
        }

        // Abre o modal de aviso programado para o usuário
        this.avisoModalData.set(res);
        this.showAvisoModal.set(true);

        // Grava no banco PostgreSQL imediatamente que o slot foi exibido para a empresa hoje
        this.authService.registraExibicaoAviso(res.slotId).subscribe({
          error: () => {},
        });
      },
      error: () => {},
    });
  }

  protected fecharAvisoModal(): void {
    if (this.bloqueioTotal()) {
      // Em bloqueio total não permite fechar, apenas ir para assinatura
      this.router.navigate(['/assinatura']);
      return;
    }
    this.showAvisoModal.set(false);
  }

  protected irParaAssinatura(): void {
    this.showAvisoModal.set(false);
    this.router.navigate(['/assinatura']);
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
    const isSg = this.router.url.includes('/sg-');
    this.authService.logout().subscribe({
      next: () => this.router.navigate([isSg ? '/sg-auth-x7k9p' : '/login']),
      error: () => this.router.navigate([isSg ? '/sg-auth-x7k9p' : '/login']),
    });
  }
}

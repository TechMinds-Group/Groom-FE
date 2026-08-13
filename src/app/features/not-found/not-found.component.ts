import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppFooterComponent } from '../../shared/components/footer/app-footer.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, AppFooterComponent],
  template: `
    <div class="d-flex flex-column min-vh-100">
      <div class="d-flex flex-column align-items-center justify-content-center text-center bg-light px-4 flex-grow-1">
        <div class="mb-4">
          <i class="fas fa-route text-muted" style="font-size: 5rem; opacity: 0.5;"></i>
        </div>
        <h1 class="display-1 fw-bold text-primary mb-2">404</h1>
        <h2 class="h3 fw-semibold text-dark mb-3">Página não encontrada</h2>
        <p class="text-muted mb-4 max-w-md">
          A rota que você tentou acessar não existe ou está em manutenção.<br>
          Verifique o endereço digitado ou volte para o início.
        </p>
        <a routerLink="/dashboard" class="btn btn-primary px-4 py-2 rounded-pill fw-semibold shadow-sm">
          <i class="fas fa-home me-2"></i>Ir para o Dashboard
        </a>
      </div>
      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    .max-w-md { max-width: 500px; margin-left: auto; margin-right: auto; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {}

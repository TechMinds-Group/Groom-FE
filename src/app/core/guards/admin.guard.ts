import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { AuthService } from '../services/auth.service';

/**
 * Guard de rotas restritas ao Administrador (padrão RN-030).
 * Requer que o authGuard do layout pai já tenha carregado o usuário corrente.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(TmToastService);

  if (authService.hasAdminRole()) {
    return true;
  }

  toastService.error('Acesso restrito ao Administrador do estabelecimento.', 'Acesso Negado');
  return router.createUrlTree(['/dashboard']);
};

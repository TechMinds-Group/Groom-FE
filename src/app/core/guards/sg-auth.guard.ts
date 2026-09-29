import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

/** Guard exclusivo para rotas do painel SG. Verifica apenas o cookie SgCookieScheme. */
export const sgAuthGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getSgMe().pipe(
    map(user => {
      if (!user) {
        return router.createUrlTree(['/sg-auth-x7k9p']);
      }
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/sg-auth-x7k9p'])))
  );
};

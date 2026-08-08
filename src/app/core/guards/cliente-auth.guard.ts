import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AgendamentoPublicoService } from '../services/agendamento-publico.service';

/** Bloqueia o acesso a rotas do cliente sem token de agendamento, redirecionando para o login. */
export const clienteAuthGuard: CanActivateFn = () => {
  const agendamentoPublicoService = inject(AgendamentoPublicoService);
  const router = inject(Router);

  if (agendamentoPublicoService.getToken()) {
    return true;
  }
  const estabelecimento = agendamentoPublicoService.estabelecimento() ?? '';
  return router.createUrlTree(['/agendamento', estabelecimento, 'login']);
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AgendamentoPublicoService } from '../services/agendamento-publico.service';

export const clienteAuthGuard: CanActivateFn = async () => {
  const agendamentoPublicoService = inject(AgendamentoPublicoService);
  const router = inject(Router);

  const cliente = await agendamentoPublicoService.getMe();
  if (cliente) {
    return true;
  }

  const estabelecimento = agendamentoPublicoService.estabelecimento() ?? '';
  return router.createUrlTree(['/agendamento', estabelecimento, 'login']);
};
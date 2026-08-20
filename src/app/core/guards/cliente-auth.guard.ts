import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AgendamentoPublicoService } from '../services/agendamento-publico.service';

export const clienteAuthGuard: CanActivateFn = async (route, state) => {
  const agendamentoPublicoService = inject(AgendamentoPublicoService);
  const router = inject(Router);

  // Extrai o estabelecimento dos parâmetros de rota (pai ou atual) ou do estado da URL
  let estab =
    route.paramMap.get('estabelecimento') ||
    route.parent?.paramMap.get('estabelecimento') ||
    agendamentoPublicoService.estabelecimento();

  if (!estab && state.url) {
    const partes = state.url.split('/').filter(Boolean);
    const idx = partes.indexOf('agendamento');
    if (idx !== -1 && partes[idx + 1] && partes[idx + 1] !== 'novo' && partes[idx + 1] !== 'login') {
      estab = partes[idx + 1];
    }
  }

  if (estab) {
    agendamentoPublicoService.setEstabelecimento(estab);
  }

  const cliente = await agendamentoPublicoService.getMe();
  if (cliente) {
    return true;
  }

  const estabFinal = agendamentoPublicoService.estabelecimento() || estab || '';
  if (estabFinal) {
    return router.createUrlTree(['/agendamento', estabFinal, 'login']);
  }

  return router.createUrlTree(['/login']);
};
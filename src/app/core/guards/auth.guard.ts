import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(TmToastService);

  const isSgRoute = state.url.includes('/sg-');
  const checkAuth$ = isSgRoute ? authService.getSgMe() : authService.getMe();

  return checkAuth$.pipe(
    map(user => {
      if (!user) {
        if (isSgRoute) {
          return router.createUrlTree(['/sg-auth-x7k9p']);
        }
        return router.createUrlTree(['/login']);
      }

      const roles = user.roles ?? [];
      const role = user.role ?? '';
      const isSuperAdminUser = role === 'SuperAdmin' || roles.includes('SuperAdmin') || user.email === 'micheladm@fasto.com' || user.email?.startsWith('micheladm');

      if (isSgRoute) {
        if (isSuperAdminUser) {
          return true;
        }
        toastService.error('Acesso restrito. Você não tem permissão para acessar o Painel SG.', 'Acesso Negado');
        return router.createUrlTree(['/dashboard']);
      }

      if (isSuperAdminUser) {
        return true;
      }

      // Verificação de bloqueio por menu e submenu do estabelecimento (Acesso Menu SG)
      const acessos = (user as any).acessosMenu || (user as any).AcessosMenu || {};
      const gestaoSub = acessos?.gestao_sub || {};
      const servicosSub = acessos?.servicos_sub || {};
      const agendamentoSub = acessos?.agendamento_online_sub || {};
      const configuracoesSub = acessos?.configuracoes_sub || {};

      const url = state.url.toLowerCase();

      let bloqueado = false;
      let menuNome = '';

      if (url.startsWith('/dashboard') && acessos.dashboard === false) {
        bloqueado = true; menuNome = 'Dashboard';
      } else if (url.startsWith('/agenda') && acessos.agenda === false) {
        bloqueado = true; menuNome = 'Agenda';
      } else if (url.startsWith('/gestao')) {
        if (acessos.gestao === false) {
          bloqueado = true; menuNome = 'Gestão';
        } else if (url.includes('/clientes') && gestaoSub.clientes === false) {
          bloqueado = true; menuNome = 'Clientes';
        } else if (url.includes('/assinantes') && gestaoSub.assinantes === false) {
          bloqueado = true; menuNome = 'Assinantes';
        } else if (url.includes('/profissionais') && gestaoSub.profissionais === false) {
          bloqueado = true; menuNome = 'Profissionais';
        } else if (url.includes('/gestao-usuarios') && gestaoSub.usuarios === false) {
          bloqueado = true; menuNome = 'Usuários';
        }
      } else if (url.startsWith('/servicos')) {
        if (acessos.servicos === false) {
          bloqueado = true; menuNome = 'Serviços';
        } else if (url.includes('/catalogo') && servicosSub.catalogo === false) {
          bloqueado = true; menuNome = 'Catálogo de Serviços';
        } else if (url.includes('/planos-estabelecimento') && servicosSub.planos === false) {
          bloqueado = true; menuNome = 'Planos';
        }
      } else if (url.startsWith('/agendamento-estabelecimento')) {
        if (acessos.agendamento_online === false) {
          bloqueado = true; menuNome = 'Agendamento Online';
        } else if (agendamentoSub.link_cliente === false) {
          bloqueado = true; menuNome = 'Link do Cliente';
        }
      } else if (url.startsWith('/configuracoes') || url.startsWith('/assinatura')) {
        if (acessos.configuracoes === false) {
          bloqueado = true; menuNome = 'Configurações';
        } else if ((url.includes('/estabelecimento') || url.includes('/horarios') || url.includes('/importacao')) && configuracoesSub.estabelecimento === false) {
          bloqueado = true; menuNome = 'Configurações do Estabelecimento';
        } else if (url.includes('/whatsapp') && configuracoesSub.whatsapp === false) {
          bloqueado = true; menuNome = 'Integração WhatsApp';
        } else if (url.startsWith('/assinatura') && configuracoesSub.assinatura === false) {
          bloqueado = true; menuNome = 'Minha Assinatura';
        } else if (url.includes('/logs') && configuracoesSub.logs === false) {
          bloqueado = true; menuNome = 'Logs do Sistema';
        }
      }

      if (bloqueado) {
        toastService.error(`O recurso "${menuNome}" está desativado para o seu estabelecimento.`, 'Acesso Negado');
        if (acessos.dashboard !== false && !url.startsWith('/dashboard')) {
          return router.createUrlTree(['/dashboard']);
        }
        return router.createUrlTree(['/login']);
      }

      return true;
    }),
    catchError(() => {
      if (state.url.includes('/sg-')) {
        return of(router.createUrlTree(['/sg-auth-x7k9p']));
      }
      return of(router.createUrlTree(['/login']));
    })
  );
};

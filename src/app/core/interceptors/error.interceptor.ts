import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { TmToastService } from '@techminds-group/tm-angular-lib';

const ERROR_MAP: Record<number, string> = {
  0: 'Servidor indisponível. Verifique sua conexão com a internet.',
  400: 'Requisição inválida. Verifique os dados enviados.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Acesso negado. Você não tem permissão para esta ação.',
  404: 'Recurso não encontrado.',
  502: 'Falha de comunicação com serviço externo. Tente novamente em alguns instantes.',
};

let last401ToastTimestamp = 0;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(TmToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = ERROR_MAP[error.status] ?? 'Ocorreu um erro inesperado.';
      let errorTitle = 'Erro';

      if (error.error) {
        if (error.error.error?.description) {
          errorMessage = error.error.error.description;
        } else if (error.error.error?.message) {
          errorMessage = error.error.error.message;
        } else if (error.error.erro) {
          errorMessage = error.error.erro;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        }
      }

      // Trata especificamente o bloqueio por assinatura vencida a 10 dias ou mais
      if (
        error.status === 403 &&
        (error.error?.code === 'Assinatura.VencidaLockout' ||
          errorMessage.includes('vencida há 10 dias'))
      ) {
        toastService.error(
          'Sua assinatura está vencida há 10 dias ou mais. O sistema está em modo somente leitura. Faça o pagamento para regularizar.',
          'Assinatura Vencida',
        );
        router.navigate(['/assinatura']);
        return throwError(() => error);
      }

      const isPublicOrAuthCheck =
        req.url.endsWith('/me') ||
        req.url.includes('/login') ||
        req.url.includes('/cadastro') ||
        req.url.includes('/publico/');

      const now = Date.now();
      const isDuplicate401 = error.status === 401 && (now - last401ToastTimestamp < 3000);

      const shouldSkipToast =
        req.headers.has('X-Skip-Error-Toast') ||
        req.url.includes('viacep.com.br') ||
        (error.status === 401 && isPublicOrAuthCheck) ||
        isDuplicate401;

      if (!shouldSkipToast) {
        if (error.status === 401) {
          last401ToastTimestamp = now;
        }
        toastService.error(errorMessage, errorTitle);
      }

      if (error.status === 401 && !isPublicOrAuthCheck) {
        localStorage.removeItem('tenant_id');
        router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};

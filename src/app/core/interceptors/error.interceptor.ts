import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
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

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(TmToastService);

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

      const isPublicOrAuthCheck =
        req.url.endsWith('/me') ||
        req.url.includes('/login') ||
        req.url.includes('/cadastro') ||
        req.url.includes('/publico/');

      const shouldSkipToast =
        req.headers.has('X-Skip-Error-Toast') ||
        (error.status === 401 && isPublicOrAuthCheck);

      if (!shouldSkipToast) {
        toastService.error(errorMessage, errorTitle);
      }

      return throwError(() => error);
    })
  );
};

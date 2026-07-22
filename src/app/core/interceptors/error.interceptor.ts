import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { TmToastService } from '@techminds-group/tm-angular-lib';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(TmToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ocorreu um erro inesperado.';
      let errorTitle = 'Erro';

      if (error.error) {
        // Handle Groom API standardized Result.Failure JSON
        if (error.error.error?.description) {
          errorMessage = error.error.error.description;
        } else if (error.error.error?.message) {
          errorMessage = error.error.error.message;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        }
      } else {
        errorMessage = error.message;
      }

      if (!req.headers.has('X-Skip-Error-Toast')) {
        toastService.error(errorMessage, errorTitle);
      }
      
      return throwError(() => error);
    })
  );
};

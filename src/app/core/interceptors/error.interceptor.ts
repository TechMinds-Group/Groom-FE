import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.error('Unauthorized request - 401');
        // TODO: Trigger Toast/Notification or Logout
      } else if (error.status === 403) {
        console.error('Forbidden request - 403');
        // TODO: Trigger Toast/Notification
      } else if (error.status >= 500) {
        console.error('Internal server error - 50x');
        // TODO: Trigger Toast/Notification
      } else {
        console.error(`HTTP Error: ${error.status}`);
      }
      return throwError(() => error);
    })
  );
};

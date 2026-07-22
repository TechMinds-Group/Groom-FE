import { HttpInterceptorFn } from '@angular/common/http';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantId = localStorage.getItem('tenant_id');

  if (tenantId) {
    const tenantReq = req.clone({
      headers: req.headers.set('X-Tenant-Id', tenantId),
      withCredentials: true
    });
    return next(tenantReq);
  }

  const credentialsReq = req.clone({
    withCredentials: true
  });
  return next(credentialsReq);
};

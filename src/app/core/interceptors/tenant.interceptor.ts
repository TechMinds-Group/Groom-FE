import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  // Não envia headers customizados do tenant nem credentials para APIs de terceiros (ex: ViaCEP)
  const isExternalUrl =
    (req.url.startsWith('http://') || req.url.startsWith('https://')) &&
    !req.url.startsWith(environment.apiUrl);

  if (isExternalUrl) {
    return next(req);
  }

  const isAuthEndpoint =
    req.url.includes('/login') ||
    req.url.includes('/logout') ||
    req.url.endsWith('/me') ||
    req.url.endsWith('/status');

  if (isAuthEndpoint) {
    return next(req.clone({ withCredentials: true }));
  }

  const tenantId = localStorage.getItem('tenant_id');

  if (tenantId) {
    const tenantReq = req.clone({
      headers: req.headers.set('X-Tenant-Id', tenantId),
      withCredentials: true,
    });
    return next(tenantReq);
  }

  const credentialsReq = req.clone({
    withCredentials: true,
  });
  return next(credentialsReq);
};

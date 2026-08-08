import { inject, Injectable, signal } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { AgendamentoPublicoService } from './agendamento-publico.service';

@Injectable({
  providedIn: 'root',
})
export class TenantResolverService {
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);

  private readonly _tenant = signal<string | null>(null);
  readonly tenant = this._tenant.asReadonly();

  /** Resolve o estabelecimento da rota (path param) ou do subdomínio e define no serviço de agendamento. */
  resolve(route: ActivatedRouteSnapshot): boolean {
    const estabelecimento =
      route.paramMap.get('estabelecimento') ?? this.detectSubdomain();
    if (estabelecimento) {
      const normalizado = estabelecimento.trim().toUpperCase();
      this._tenant.set(normalizado);
      this.agendamentoPublicoService.setEstabelecimento(normalizado);
      return true;
    }
    return false;
  }

  private detectSubdomain(): string | null {
    const parts = window.location.hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') {
      return parts[0];
    }
    return null;
  }
}

/** Resolver de rota que extrai o estabelecimento e o propaga ao serviço de agendamento. */
export const tenantResolver: ResolveFn<boolean> = (route) => {
  return inject(TenantResolverService).resolve(route);
};

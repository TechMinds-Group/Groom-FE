import { Pipe, PipeTransform, inject } from '@angular/core';
import { ClientesHelperService } from '../services/clientes-helper.service';

export interface StatusClienteBadgeResult {
  badgeClass: string;
  iconClass: string;
  label: string;
}

@Pipe({
  name: 'statusClienteBadge',
  standalone: true,
  pure: true,
})
export class StatusClienteBadgePipe implements PipeTransform {
  private helper = inject(ClientesHelperService);

  transform(status: string): StatusClienteBadgeResult | null {
    const configs: Record<string, StatusClienteBadgeResult> = {
      Ativo: { badgeClass: 'bg-success-subtle text-success border-success-subtle', iconClass: 'fas fa-circle me-1', label: 'Ativo' },
      Inativo: { badgeClass: 'bg-secondary-subtle text-secondary border-secondary-subtle', iconClass: 'fas fa-circle me-1', label: 'Inativo' },
    };
    return configs[status] ?? null;
  }
}
import { Pipe, PipeTransform } from '@angular/core';

export interface StatusBadgeConfig {
  label: string;
  badgeClass: string;
  iconClass: string;
}

const STATUS_CONFIG: Record<string, StatusBadgeConfig> = {
  Ativo: { label: 'Ativo', badgeClass: 'bg-success-subtle text-success border-success-subtle', iconClass: 'fas fa-check-circle' },
  Pendente: { label: 'Pendente', badgeClass: 'bg-warning-subtle text-warning border-warning-subtle', iconClass: 'fas fa-clock' },
  Expirado: { label: 'Expirado', badgeClass: 'bg-danger-subtle text-danger border-danger-subtle', iconClass: 'fas fa-times-circle' },
};

@Pipe({
  name: 'statusAssinanteBadge',
  standalone: true,
  pure: true,
})
export class StatusAssinanteBadgePipe implements PipeTransform {
  transform(status: string): StatusBadgeConfig | null {
    return STATUS_CONFIG[status] || null;
  }
}

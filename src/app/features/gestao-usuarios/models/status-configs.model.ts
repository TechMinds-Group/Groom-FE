import { StatusBadgeConfig } from './status-badge-config.model';

export const STATUS_CONFIGS: Record<string, StatusBadgeConfig> = {
  'Ativo': {
    badgeClass: 'bg-success-subtle text-success border border-success-subtle',
    iconClass: 'fas fa-check-circle',
    label: 'Ativo'
  },
  'Inativo': {
    badgeClass: 'bg-dark-subtle text-dark border border-dark-subtle',
    iconClass: 'fas fa-times-circle',
    label: 'Inativo'
  }
};

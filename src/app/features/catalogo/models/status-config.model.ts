export interface ServicoStatusBadgeConfig {
  badgeClass: string;
  iconClass: string;
  label: string;
}

export const SERVICO_STATUS_CONFIGS: Record<string, ServicoStatusBadgeConfig> = {
  Ativo: {
    badgeClass: 'bg-success-subtle text-success border border-success-subtle',
    iconClass: 'fas fa-check-circle',
    label: 'Ativo',
  },
  Inativo: {
    badgeClass: 'bg-danger-subtle text-danger border border-danger-subtle',
    iconClass: 'fas fa-times-circle',
    label: 'Inativo',
  },
};
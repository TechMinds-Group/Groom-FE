export interface ClienteConfig {
}

export const STATUS_CLIENTE_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
];

export const STATUS_BADGE_CONFIG: Record<string, { badgeClass: string; iconClass: string; label: string }> = {
  Ativo: { badgeClass: 'bg-success-subtle text-success border-success-subtle', iconClass: 'fas fa-circle', label: 'Ativo' },
  Inativo: { badgeClass: 'bg-secondary-subtle text-secondary border-secondary-subtle', iconClass: 'fas fa-circle', label: 'Inativo' },
};
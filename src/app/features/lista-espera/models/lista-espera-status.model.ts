/**
 * Config visual de status das entradas da lista de espera no painel staff
 * (UI_SPEC §5.15 — `Ativa | Convertida | Removida | Expirada`).
 */

export interface StatusListaEsperaBadge {
  label: string;
  badgeClass: string;
  iconClass: string;
}

/** Mapeamento status → badge (const RECORD — não usar enum). */
export const STATUS_LISTA_ESPERA: Record<string, StatusListaEsperaBadge> = {
  Ativa: {
    label: 'Ativa',
    badgeClass: 'bg-success-subtle text-success border-success-subtle',
    iconClass: 'fas fa-hourglass-half',
  },
  Convertida: {
    label: 'Convertida',
    badgeClass: 'bg-primary-subtle text-primary border-primary-subtle',
    iconClass: 'fas fa-calendar-check',
  },
  Removida: {
    label: 'Removida',
    badgeClass: 'bg-secondary-subtle text-secondary border-secondary-subtle',
    iconClass: 'fas fa-user-minus',
  },
  Expirada: {
    label: 'Expirada',
    badgeClass: 'bg-danger-subtle text-danger border-danger-subtle',
    iconClass: 'fas fa-hourglass-end',
  },
};

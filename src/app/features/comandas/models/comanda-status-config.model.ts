import { ComandaStatus } from '../../../core/models/comanda/comanda.model';

export interface ComandaStatusBadgeConfig {
  label: string;
  badgeClass: string;
  iconClass: string;
}

/**
 * Mapeamento status → badge da comanda (const RECORD).
 * Cores da UI_SPEC: Aberta #fd7e14, Fechada #198754, Cancelada #dc3545 —
 * as classes CSS estão definidas no .scss dos componentes da feature.
 */
export const STATUS_COMANDA_BADGE: Record<ComandaStatus, ComandaStatusBadgeConfig> = {
  Aberta: { label: 'Aberta', badgeClass: 'badge-comanda-aberta', iconClass: 'fas fa-receipt' },
  Fechada: { label: 'Fechada', badgeClass: 'badge-comanda-fechada', iconClass: 'fas fa-circle-check' },
  Cancelada: { label: 'Cancelada', badgeClass: 'badge-comanda-cancelada', iconClass: 'fas fa-ban' },
};

export type FiltroStatusComanda = '' | ComandaStatus;

export interface FiltroStatusComandaOption {
  value: FiltroStatusComanda;
  label: string;
}

/** Filtro rápido da listagem ("" = Todas). */
export const FILTROS_STATUS_COMANDA: FiltroStatusComandaOption[] = [
  { value: '', label: 'Todas' },
  { value: 'Aberta', label: 'Abertas' },
  { value: 'Fechada', label: 'Fechadas' },
  { value: 'Cancelada', label: 'Canceladas' },
];

import { Injectable } from '@angular/core';
import { PlanoStatusBadgeConfig, PLANO_STATUS_CONFIGS } from '../models/plano-status-config.model';
import { PLANO_FREQUENCIA_LABELS } from '../models/plano-frequencia-config.model';

@Injectable()
export class PlanosEstabelecimentoHelperService {
  getStatusBadgeConfig(status: string): PlanoStatusBadgeConfig {
    const config = PLANO_STATUS_CONFIGS[status];
    if (config) {
      return config;
    }
    return {
      badgeClass: 'bg-secondary-subtle text-secondary border border-secondary-subtle',
      iconClass: 'fas fa-question-circle',
      label: status || 'Desconhecido',
    };
  }

  getFrequenciaLabel(frequencia: string): string {
    return PLANO_FREQUENCIA_LABELS[frequencia] || frequencia;
  }
}
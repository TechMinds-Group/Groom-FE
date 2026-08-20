import { Injectable } from '@angular/core';
import { PerfilBadgeConfig } from '../models/perfil-badge-config.model';
import { StatusBadgeConfig } from '../models/status-badge-config.model';
import { STATUS_CONFIGS } from '../models/status-configs.model';

@Injectable({
  providedIn: 'root',
})
export class GestaoUsuariosHelperService {
  getPerfilBadgeConfig(perfil: string, corHex?: string, iconeClass?: string): PerfilBadgeConfig {
    const label = perfil || 'Desconhecido';
    const shortLabel = label === 'Administrador' ? 'Admin' : label;
    const color = corHex || '#6c757d';
    const icon = iconeClass || 'fas fa-user';
    
    return {
      badgeClass: 'custom-badge-color',
      iconClass: icon,
      label: label,
      shortLabel: shortLabel,
      corHex: color
    };
  }

  getPerfilBadgeConfigs(perfilStr: string, corHex?: string, iconeClass?: string): PerfilBadgeConfig[] {
    if (!perfilStr) {
      return [this.getPerfilBadgeConfig('Desconhecido')];
    }
    const parts = perfilStr.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      return [this.getPerfilBadgeConfig('Desconhecido')];
    }

    return parts.map(part => {
      let badgeClass = 'bg-secondary-subtle text-secondary border-secondary-subtle';
      let icon = 'fas fa-user';

      if (part === 'Administrador') {
        badgeClass = 'bg-danger-subtle text-danger border-danger-subtle';
        icon = 'fas fa-shield-alt';
      } else if (part === 'Operador') {
        badgeClass = 'bg-primary-subtle text-primary border-primary-subtle';
        icon = 'fas fa-desktop';
      } else if (part === 'Profissional') {
        badgeClass = 'bg-secondary-subtle text-secondary border-secondary-subtle';
        icon = 'fas fa-user-tie';
      }

      return {
        badgeClass: badgeClass,
        iconClass: icon,
        label: part,
        shortLabel: part === 'Administrador' ? 'Admin' : part,
        corHex: corHex || '#6c757d'
      };
    });
  }

  getStatusBadgeConfig(status: string): StatusBadgeConfig {
    const key = status || '';
    const config = STATUS_CONFIGS[key];
    if (config) {
      return config;
    }
    return {
      badgeClass: 'bg-secondary-subtle text-secondary border border-secondary-subtle',
      iconClass: 'fas fa-question-circle',
      label: key || 'Desconhecido'
    };
  }
}

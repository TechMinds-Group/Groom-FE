import { Pipe, PipeTransform, inject } from '@angular/core';
import { GestaoUsuariosHelperService } from '../services/gestao-usuarios-helper.service';
import { PerfilBadgeConfig } from '../models/perfil-badge-config.model';

export interface PerfilBadgeInput {
  perfil: string;
  perfilCorHex?: string;
  perfilIconeClass?: string;
}

@Pipe({
  name: 'perfilBadge',
  standalone: true,
  pure: true
})
export class PerfilBadgePipe implements PipeTransform {
  private readonly helper = inject(GestaoUsuariosHelperService);

  transform(value: PerfilBadgeInput | string | null | undefined): PerfilBadgeConfig[] {
    if (!value) {
      return [this.helper.getPerfilBadgeConfig('Desconhecido')];
    }
    if (typeof value === 'string') {
      return this.helper.getPerfilBadgeConfigs(value);
    }
    return this.helper.getPerfilBadgeConfigs(value.perfil, value.perfilCorHex, value.perfilIconeClass);
  }
}

import { Pipe, PipeTransform, inject } from '@angular/core';
import { GestaoUsuariosHelperService } from '../services/gestao-usuarios-helper.service';
import { StatusBadgeConfig } from '../models/status-badge-config.model';

@Pipe({
  name: 'statusBadge',
  standalone: true,
  pure: true
})
export class StatusBadgePipe implements PipeTransform {
  private readonly helper = inject(GestaoUsuariosHelperService);

  transform(value: string | null | undefined): StatusBadgeConfig {
    return this.helper.getStatusBadgeConfig(value || '');
  }
}

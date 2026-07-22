import { Pipe, PipeTransform, inject } from '@angular/core';
import { PlanosEstabelecimentoHelperService } from '../services/planos-estabelecimento-helper.service';
import { PlanoStatusBadgeConfig } from '../models/plano-status-config.model';

@Pipe({
  name: 'statusPlano',
  standalone: true,
  pure: true,
})
export class StatusPlanoPipe implements PipeTransform {
  private readonly helper = inject(PlanosEstabelecimentoHelperService);

  transform(value: string | null | undefined): PlanoStatusBadgeConfig {
    return this.helper.getStatusBadgeConfig(value || '');
  }
}
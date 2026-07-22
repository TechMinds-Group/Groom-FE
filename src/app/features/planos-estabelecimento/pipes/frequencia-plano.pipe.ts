import { Pipe, PipeTransform, inject } from '@angular/core';
import { PlanosEstabelecimentoHelperService } from '../services/planos-estabelecimento-helper.service';

@Pipe({
  name: 'frequenciaPlano',
  standalone: true,
  pure: true,
})
export class FrequenciaPlanoPipe implements PipeTransform {
  private readonly helper = inject(PlanosEstabelecimentoHelperService);

  transform(value: string | null | undefined): string {
    return this.helper.getFrequenciaLabel(value || '');
  }
}
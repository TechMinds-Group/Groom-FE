import { Pipe, PipeTransform, inject } from '@angular/core';
import { StatusListaEsperaBadge } from '../models/lista-espera-status.model';
import { ListaEsperaHelperService } from '../services/lista-espera-helper.service';

/** Renderiza o badge de status da entrada no painel da lista de espera. */
@Pipe({
  name: 'statusListaEsperaBadge',
  standalone: true,
  pure: true,
})
export class StatusListaEsperaPipe implements PipeTransform {
  private readonly helper = inject(ListaEsperaHelperService);

  transform(status: string): StatusListaEsperaBadge | null {
    return this.helper.statusParaBadge(status);
  }
}

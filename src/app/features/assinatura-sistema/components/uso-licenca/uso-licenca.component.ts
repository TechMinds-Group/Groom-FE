import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PlanoGroomEstado } from '../../models/plano-groom-estado.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/**
 * Exibe as barras de progresso de uso da licença: profissionais, clientes e clientes assinantes.
 * Suporta internacionalização completa.
 */
@Component({
  selector: 'app-uso-licenca',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './uso-licenca.component.html',
  styleUrl: './uso-licenca.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsoLicencaComponent {
  readonly plano = input.required<PlanoGroomEstado>();
  readonly pctProfissionais = input.required<number>();
  readonly pctClientes = input.required<number>();
  readonly pctClientesAssinantes = input.required<number>();
}

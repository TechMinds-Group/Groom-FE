import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanoGroomEstado } from '../../models/plano-groom-estado.model';
import { StatusAssinatura } from '../../enums/status-assinatura.enum';
import { LanguageService } from '../../../../core/services/language.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/**
 * Exibe o card com os dados do plano de assinatura atual do estabelecimento:
 * nome, status (Ativo/inativo), valor, ciclo e validade.
 * Suporta internacionalização completa e formatação monetária por idioma.
 */
@Component({
  selector: 'app-plano-atual',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './plano-atual.component.html',
  styleUrl: './plano-atual.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanoAtualComponent {
  private readonly languageService = inject(LanguageService);

  readonly plano = input.required<PlanoGroomEstado>();

  /** Expõe o enum ao template para comparações sem strings hardcoded */
  protected readonly StatusAssinatura = StatusAssinatura;

  /** Valor do plano formatado reativamente de acordo com o idioma/moeda ativos */
  protected readonly valorFormatado = computed(() =>
    this.languageService.formatMoney(this.plano().valor),
  );
}

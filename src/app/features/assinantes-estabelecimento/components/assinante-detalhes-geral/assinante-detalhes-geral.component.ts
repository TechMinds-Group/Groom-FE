import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssinanteDetalhes } from '../../models/assinante-config.model';
import { StatusAssinanteBadgePipe } from '../../pipes/status-assinante.pipe';
import { AssinantesEstabelecimentoHelperService } from '../../services/assinantes-estabelecimento-helper.service';

@Component({
  selector: 'app-assinante-detalhes-geral',
  standalone: true,
  imports: [CommonModule, StatusAssinanteBadgePipe],
  templateUrl: './assinante-detalhes-geral.component.html',
  styleUrl: './assinante-detalhes-geral.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssinanteDetalhesGeralComponent {
  protected readonly helper = inject(AssinantesEstabelecimentoHelperService);
  assinante = input.required<AssinanteDetalhes>();
}

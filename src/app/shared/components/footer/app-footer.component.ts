import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Rodapé global do Groom (direitos reservados + link para o site oficial).
 * Exibido em todas as páginas, inclusive telas de login.
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppFooterComponent {
  protected readonly anoAtual = new Date().getFullYear();
}

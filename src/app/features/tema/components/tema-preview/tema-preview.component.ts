import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { TemaLeitura } from '../../../../core/models/tema/tema.model';
import { TemaVisualService } from '../../../../core/services/tema-visual.service';
import { ThemeService } from '../../../../core/services/theme.service';

/**
 * Preview ao vivo do editor de tema (UI_SPEC §5.30) — miniaturas do painel e do
 * portal com as variáveis do tema aplicadas a cada mudança, antes de salvar.
 * Mocks construídos com as mesmas CSS custom properties do runtime (sem iframes).
 */
@Component({
  selector: 'app-tema-preview',
  standalone: true,
  templateUrl: './tema-preview.component.html',
  styleUrl: './tema-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemaPreviewComponent {
  private readonly temaVisual = inject(TemaVisualService);
  private readonly themeService = inject(ThemeService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Payload do tema (real do servidor ou sintético do formulário); null = padrão do sistema. */
  readonly tema = input.required<TemaLeitura | null>();

  /** true quando a URL do logo configurada falhou ao carregar (fallback para a marca padrão). */
  protected readonly logoErro = signal(false);

  constructor() {
    effect(() => {
      const tema = this.tema();
      const variaveis = this.temaVisual.mapearVariaveis(tema, this.themeService.isDarkMode());
      this.temaVisual.aplicarEmElemento(this.elemento.nativeElement, variaveis);
    });
  }

  /** Marca padrão quando o logo do tema é nulo ou falhou (RN-100). */
  protected logoVisivel(logoUrl: string | null): boolean {
    return !!logoUrl && !this.logoErro();
  }
}

import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  TemaDirecaoGradiente,
  TemaGradientes,
  TemaLeitura,
  TEMA_SLOTS_BASE,
  TEMA_SLOTS_ESCURO,
  TemaSlot,
} from '../models/tema/tema.model';
import { TemaService } from './tema.service';
import { ThemeService } from './theme.service';

/** Graus CSS de cada direção de gradiente (CR-001). */
const DIRECAO_GRAUS: Record<TemaDirecaoGradiente, number> = {
  horizontal: 90,
  vertical: 180,
  diagonal: 135,
};

/** Variáveis CSS do tema aplicadas por slot (valor visual — cor sólida ou linear-gradient). */
const VARS_SLOT: Record<TemaSlot, string> = {
  primaria: '--tema-primaria',
  secundaria: '--tema-secundaria',
  acento: '--tema-acento',
  fundo: '--tema-fundo',
  texto: '--tema-texto',
  escuroPrimaria: '--tema-primaria',
  escuroSecundaria: '--tema-secundaria',
  escuroAcento: '--tema-acento',
  escuroFundo: '--tema-fundo',
  escuroTexto: '--tema-texto',
};

/** Fallback do design system usado quando a fonte do tema não está configurada. */
const FONTE_FALLBACK = "Inter, system-ui, -apple-system, sans-serif";

/**
 * Aplicação runtime do tema via CSS custom properties (RN-098/099/100 — UI_SPEC §5.30).
 * Painel: carregado no boot do app; portal: aplicado junto da resolução do slug.
 * `configurado: false` → variáveis removidas, padrão do Groom permanece (fallback RN-100).
 */
@Injectable({
  providedIn: 'root',
})
export class TemaVisualService {
  private readonly document = inject(DOCUMENT);
  private readonly temaService = inject(TemaService);
  private readonly themeService = inject(ThemeService);

  /** Último payload de tema conhecido (null = padrão do sistema). */
  private readonly _tema = signal<TemaLeitura | null>(null);
  readonly tema = this._tema.asReadonly();
  readonly configurado = computed(() => this._tema()?.configurado ?? false);
  /** Logo externo do tema; null = marca padrão do sistema (RN-100). */
  readonly logoUrl = computed(() => this._tema()?.logoUrl ?? null);

  constructor() {
    // RN-099: em PorModo, trocar o modo claro/escuro do sistema reaplica as cores escuras.
    effect(() => {
      this.themeService.isDarkMode();
      const tema = untracked(this._tema);
      if (tema) {
        this.aplicar(tema);
      }
    });
  }

  /** Carrega o tema do painel (GET api/tema) e aplica; falha mantém o padrão (RN-100). */
  async carregarAplicar(): Promise<void> {
    try {
      const tema = await this.temaService.obterTema();
      this.aplicar(tema);
    } catch {
      // Fallback RN-100 — a leitura do tema nunca bloqueia o painel.
    }
  }

  /** Carrega o tema público por slug (§19.1) e aplica; falha mantém o padrão (RN-100). */
  async carregarAplicarPublico(estabelecimento: string): Promise<void> {
    try {
      const tema = await this.temaService.obterTemaPublico(estabelecimento);
      this.aplicar(tema);
    } catch {
      // Fallback RN-100 — o portal segue no visual padrão.
    }
  }

  /** Aplica o payload nas variáveis do :root sem recarregar a página (RN-098). */
  aplicar(tema: TemaLeitura): void {
    if (untracked(this._tema) !== tema) {
      this._tema.set(tema);
    }
    const variaveis = this.mapearVariaveis(tema, this.themeService.isDarkMode());
    this.aplicarEmElemento(this.document.documentElement, variaveis);
  }

  /**
   * Aplica um mapa de variáveis CSS num elemento (usado pelo preview do editor e do modal).
   * Valores null removem a variável (volta ao fallback da folha de estilo).
   */
  aplicarEmElemento(elemento: HTMLElement, variaveis: Record<string, string | null>): void {
    for (const [nome, valor] of Object.entries(variaveis)) {
      if (valor === null) {
        elemento.style.removeProperty(nome);
      } else {
        elemento.style.setProperty(nome, valor);
      }
    }
  }

  /**
   * Mapeia o payload do tema para CSS custom properties (RN-098/099/100).
   * Slots com gradiente recebem `linear-gradient(<direcao>, cor1, cor2)` (CR-001);
   * as variáveis do design system (`--tm-*`) recebem a cor sólida (coluna persiste cor1).
   */
  mapearVariaveis(tema: TemaLeitura | null, escuro: boolean): Record<string, string | null> {
    const variaveis: Record<string, string | null> = {};

    if (!tema || !tema.configurado) {
      // RN-100 — tema padrão: remove tudo, defaults do design system voltam a valer.
      for (const slot of [...TEMA_SLOTS_BASE, ...TEMA_SLOTS_ESCURO]) {
        variaveis[VARS_SLOT[slot]] = null;
      }
      variaveis['--tema-logo-url'] = null;
      variaveis['--tema-fonte-titulo'] = null;
      variaveis['--tema-fonte-corpo'] = null;
      variaveis['--tm-primary'] = null;
      variaveis['--tm-secondary'] = null;
      variaveis['--tm-bg-color'] = null;
      variaveis['--tm-text-primary'] = null;
      variaveis['--tm-font-sans'] = null;
      return variaveis;
    }

    const usarEscuro = escuro && tema.modoPaleta === 'PorModo';
    const slots = usarEscuro ? TEMA_SLOTS_ESCURO : TEMA_SLOTS_BASE;
    const gradientes = tema.gradientes ?? {};

    for (const slot of slots) {
      const gradiente = gradientes[slot];
      if (gradiente) {
        variaveis[VARS_SLOT[slot]] = this.montarLinearGradient(gradiente);
      } else {
        variaveis[VARS_SLOT[slot]] = tema[slot] ?? null;
      }
    }

    // Cor sólida (cor1 quando o slot usa gradiente) sobrescreve os tokens do design system.
    variaveis['--tm-primary'] = corSolida(tema, 'primaria');
    variaveis['--tm-secondary'] = corSolida(tema, 'secundaria');
    variaveis['--tm-bg-color'] = corSolida(tema, 'fundo');
    variaveis['--tm-text-primary'] = corSolida(tema, 'texto');

    variaveis['--tema-logo-url'] = tema.logoUrl ? `url("${tema.logoUrl}")` : null;
    variaveis['--tema-fonte-titulo'] = tema.fonteTitulo ?? null;
    variaveis['--tema-fonte-corpo'] = tema.fonteCorpo ?? null;
    variaveis['--tm-font-sans'] = tema.fonteCorpo
      ? `${tema.fonteCorpo}, ${FONTE_FALLBACK}`
      : null;

    return variaveis;
  }

  /** Monta o valor CSS `linear-gradient` do slot (CR-001). */
  montarLinearGradient(gradiente: { cor1: string; cor2: string; direcao: TemaDirecaoGradiente }): string {
    return `linear-gradient(${DIRECAO_GRAUS[gradiente.direcao]}deg, ${gradiente.cor1}, ${gradiente.cor2})`;
  }
}

/** Cor sólida do slot — o hex persistido mantém `cor1` quando o slot usa gradiente (CR-001). */
function corSolida(tema: TemaLeitura, slot: string): string | null {
  const gradiente = (tema.gradientes ?? {})[slot];
  if (gradiente) {
    return gradiente.cor1;
  }
  const cor = (tema as unknown as Record<string, string | null>)[slot];
  return cor ?? null;
}

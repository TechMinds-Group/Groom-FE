import { DOCUMENT } from '@angular/common';
import { Injectable, Renderer2, RendererFactory2, computed, inject, signal } from '@angular/core';

/** Chave de persistência da preferência manual de tema nas telas públicas. */
const STORAGE_KEY = 'tema-publico';

/**
 * Aplica o tema (claro/escuro) às telas públicas de agendamento.
 * Segue a preferência do sistema (`prefers-color-scheme`) e permite alternância manual
 * (ícone sol/lua), priorizada e persistida em localStorage. Ao sair da tela pública,
 * restaura o tema que estava ativo no sistema de gestão.
 */
@Injectable({
  providedIn: 'root',
})
export class TemaPublicoService {
  private readonly document = inject(DOCUMENT);
  private readonly renderer: Renderer2;
  private readonly mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly sistemaDark = signal(this.mediaQuery.matches);
  private readonly preferenciaManual = signal<'dark' | 'light' | null>(this.carregarPreferencia());
  private readonly temaAnterior: 'dark' | 'light' | null;
  private readonly onChangeMedia = (event: MediaQueryListEvent): void => {
    this.sistemaDark.set(event.matches);
    // Sem preferência manual, acompanha a mudança do sistema em tempo real.
    if (!this.preferenciaManual()) {
      this.aplicar(this.tema());
    }
  };

  /** Tema ativo da tela pública (preferência manual > preferência do sistema). */
  readonly tema = computed<'dark' | 'light'>(() =>
    this.preferenciaManual() ?? (this.sistemaDark() ? 'dark' : 'light'),
  );

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.temaAnterior = this.document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | null;
    this.aplicar(this.tema());
    this.mediaQuery.addEventListener('change', this.onChangeMedia);
  }

  /** Alterna entre claro e escuro, persistindo a escolha manual do visitante. */
  alternarTema(): void {
    const proximo = this.tema() === 'dark' ? 'light' : 'dark';
    this.preferenciaManual.set(proximo);
    window.localStorage.setItem(STORAGE_KEY, proximo);
    this.aplicar(this.tema());
  }

  /**
   * Restaura o tema que estava ativo antes de entrar na tela pública
   * (preferência do usuário do sistema de gestão, se houver).
   */
  restaurarTemaAnterior(): void {
    this.mediaQuery.removeEventListener('change', this.onChangeMedia);
    if (this.temaAnterior) {
      this.renderer.setAttribute(this.document.documentElement, 'data-theme', this.temaAnterior);
    } else {
      this.renderer.removeAttribute(this.document.documentElement, 'data-theme');
    }
  }

  private aplicar(tema: 'dark' | 'light'): void {
    if (tema === 'dark') {
      this.renderer.setAttribute(this.document.documentElement, 'data-theme', 'dark');
    } else {
      this.renderer.removeAttribute(this.document.documentElement, 'data-theme');
    }
  }

  private carregarPreferencia(): 'dark' | 'light' | null {
    const valor = window.localStorage.getItem(STORAGE_KEY);
    return valor === 'dark' || valor === 'light' ? valor : null;
  }
}

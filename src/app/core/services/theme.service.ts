import { Injectable, Renderer2, RendererFactory2, signal, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private document = inject(DOCUMENT);
  private renderer: Renderer2;
  
  isDarkMode = signal<boolean>(this.getInitialTheme());

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);

    effect(() => {
      const mode = this.isDarkMode();
      if (mode) {
        this.renderer.setAttribute(this.document.documentElement, 'data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        this.renderer.removeAttribute(this.document.documentElement, 'data-theme');
        localStorage.setItem('theme', 'light');
      }
    });
  }

  private getInitialTheme(): boolean {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  toggleTheme(): void {
    this.isDarkMode.update(v => !v);
  }
}

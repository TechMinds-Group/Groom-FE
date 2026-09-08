import { Injectable, Renderer2, RendererFactory2, signal, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemePreference = 'dispositivo' | 'escuro' | 'claro';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private document = inject(DOCUMENT);
  private renderer: Renderer2;
  
  public themePreference = signal<ThemePreference>(this.getInitialPreference());
  public isDarkMode = signal<boolean>(false);

  private mediaQueryListener?: (e: MediaQueryListEvent) => void;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initSystemListener();
    this.applyPreference(this.themePreference());
  }

  private getInitialPreference(): ThemePreference {
    const savedPref = localStorage.getItem('theme_preference') as ThemePreference | null;
    if (savedPref && ['dispositivo', 'escuro', 'claro'].includes(savedPref)) {
      return savedPref;
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') return 'escuro';
    if (savedTheme === 'light') return 'claro';
    return 'dispositivo';
  }

  private initSystemListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQueryListener = (e: MediaQueryListEvent) => {
        if (this.themePreference() === 'dispositivo') {
          this.applyDarkState(e.matches);
        }
      };
      mediaQuery.addEventListener('change', this.mediaQueryListener);
    }
  }

  public setThemePreference(pref: string | null | undefined): void {
    const normalized: ThemePreference = 
      pref === 'escuro' ? 'escuro' :
      pref === 'claro' ? 'claro' : 'dispositivo';

    this.themePreference.set(normalized);
    localStorage.setItem('theme_preference', normalized);
    this.applyPreference(normalized);
  }

  private applyPreference(pref: ThemePreference): void {
    if (pref === 'escuro') {
      this.applyDarkState(true);
    } else if (pref === 'claro') {
      this.applyDarkState(false);
    } else {
      const isSystemDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyDarkState(isSystemDark);
    }
  }

  private applyDarkState(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    if (isDark) {
      this.renderer.setAttribute(this.document.documentElement, 'data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      this.renderer.removeAttribute(this.document.documentElement, 'data-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  public toggleTheme(): void {
    const next: ThemePreference = this.isDarkMode() ? 'claro' : 'escuro';
    this.setThemePreference(next);
  }
}

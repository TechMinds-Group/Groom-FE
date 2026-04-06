import { Injectable, signal, effect, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'groom-theme';
  isDarkMode = signal<boolean>(false);

  constructor(@Inject(DOCUMENT) private document: Document) {
    // Carrega o tema salvo ou prefere o do sistema
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    this.isDarkMode.set(savedTheme ? savedTheme === 'dark' : prefersDark);

    // Efeito para aplicar o tema sempre que o sinal mudar
    effect(() => {
      const mode = this.isDarkMode() ? 'dark' : 'light';
      this.document.documentElement.setAttribute('data-theme', mode);
      localStorage.setItem(this.THEME_KEY, mode);
      
      // Também sincroniza com a classe do body para compatibilidade extra
      if (this.isDarkMode()) {
        this.document.body.classList.add('dark-theme');
      } else {
        this.document.body.classList.remove('dark-theme');
      }
    });
  }

  toggleTheme() {
    this.isDarkMode.update(dark => !dark);
  }
}

import { ChangeDetectionStrategy, Component, model, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';
import { LanguageService, SupportedLanguage } from '../../../../../core/services/language.service';

@Component({
  selector: 'app-sidebar-modal-idioma',
  standalone: true,
  imports: [CommonModule, TmModalComponent],
  templateUrl: './sidebar-modal-idioma.component.html',
  styleUrl: './sidebar-modal-idioma.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarModalIdiomaComponent {
  show = model<boolean>(false);

  private languageService = inject(LanguageService);

  protected readonly currentLang = this.languageService.currentLang;

  protected readonly idiomas: { code: SupportedLanguage; label: string; flagSrc: string }[] = [
    { code: 'pt-BR', label: 'Português', flagSrc: 'languages/Flag_of_Brazil.svg' },
    { code: 'en-US', label: 'English', flagSrc: 'languages/Flag_of_the_United_States.svg' },
    { code: 'es-ES', label: 'Español', flagSrc: 'languages/Flag_of_Spain.svg' },
  ];

  protected selecionarIdioma(code: SupportedLanguage): void {
    this.languageService.setLanguage(code);
    this.show.set(false);
  }
}

import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { TxKey } from '../../core/i18n/i18n.types';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);

  transform(key: TxKey | string | null | undefined): string {
    if (!key) {
      return '';
    }
    return this.languageService.translate(key as TxKey);
  }
}

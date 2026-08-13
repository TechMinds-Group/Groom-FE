import { Injectable, signal, computed } from '@angular/core';
import { formatCurrency } from '@angular/common';
import { ptBR } from '../i18n/pt-BR';
import { enUS } from '../i18n/en-US';
import { esES } from '../i18n/es-ES';
import { TranslationSchema, TxKey } from '../i18n/i18n.types';

export type SupportedLanguage = 'pt-BR' | 'en-US' | 'es-ES';

/** Configuração de moeda associada a cada idioma suportado */
export interface CurrencyConfig {
  locale: string;
  currency: string;
  symbol: string;
  rateFromBRL: number;
}

interface ExchangeRateApiResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

const STATIC_CURRENCY_META: Record<SupportedLanguage, Omit<CurrencyConfig, 'rateFromBRL'>> = {
  'pt-BR': { locale: 'pt-BR', currency: 'BRL', symbol: 'R$' },
  'en-US': { locale: 'en-US', currency: 'USD', symbol: '$' },
  'es-ES': { locale: 'es-ES', currency: 'EUR', symbol: '€' },
};

const DICTIONARIES: Record<SupportedLanguage, TranslationSchema> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
};

const STORAGE_KEY = 'groom_lang';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly currentLangSignal = signal<SupportedLanguage>(this.getInitialLanguage());

  /** Taxas de câmbio dinâmicas em relação ao Real (BRL). Valores padrão de fallback */
  private readonly ratesSignal = signal<Record<string, number>>({
    BRL: 1.0,
    USD: 0.18,
    EUR: 0.16,
  });

  readonly currentLang = this.currentLangSignal.asReadonly();

  readonly dictionary = computed<TranslationSchema>(() => {
    return DICTIONARIES[this.currentLangSignal()] || DICTIONARIES['pt-BR'];
  });

  /**
   * Configuração de moeda reativa com cotação dinâmica obtida via API externa.
   */
  readonly currencyConfig = computed<CurrencyConfig>(() => {
    const lang = this.currentLangSignal();
    const meta = STATIC_CURRENCY_META[lang];
    const rates = this.ratesSignal();
    const rateFromBRL = rates[meta.currency] ?? 1.0;

    return {
      ...meta,
      rateFromBRL,
    };
  });

  constructor() {
    this.buscarCotacoesAtualizadas();
  }

  /**
   * Busca em tempo real as cotações das moedas em relação ao Real (BRL) usando fetch nativo.
   * O uso de fetch nativo garante isolamento contra o errorInterceptor do Angular.
   */
  private async buscarCotacoesAtualizadas(): Promise<void> {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/BRL');
      if (response.ok) {
        const res: ExchangeRateApiResponse = await response.json();
        if (res && res.rates) {
          this.ratesSignal.update((atuais) => ({
            ...atuais,
            USD: res.rates['USD'] ?? atuais['USD'],
            EUR: res.rates['EUR'] ?? atuais['EUR'],
          }));
        }
      }
    } catch {
      // Silencioso: mantém valores de fallback sem disparar alertas de erro no app
    }
  }

  /**
   * Converte um valor base em Reais (BRL) para a moeda do idioma ativo.
   */
  convertFromBRL(valueInBRL: number): number {
    return valueInBRL * this.currencyConfig().rateFromBRL;
  }

  /**
   * Converte um valor base em Reais (BRL) para a moeda do idioma ativo e formata como string monetária.
   */
  formatMoney(valueInBRL: number): string {
    const { locale, currency, symbol } = this.currencyConfig();
    const converted = this.convertFromBRL(valueInBRL);
    return formatCurrency(converted, locale, symbol, currency, '1.2-2');
  }

  setLanguage(lang: string): void {
    const validLang: SupportedLanguage = this.isSupported(lang)
      ? (lang as SupportedLanguage)
      : 'pt-BR';
    this.currentLangSignal.set(validLang);
    try {
      localStorage.setItem(STORAGE_KEY, validLang);
    } catch (e) {
      console.warn('Could not save language to localStorage', e);
    }
  }

  translate(key: TxKey | string): string {
    const dict = this.dictionary();
    const keys = key.split('.');
    let result: any = dict;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key;
      }
    }

    return typeof result === 'string' ? result : key;
  }

  private isSupported(lang: string): boolean {
    return lang === 'pt-BR' || lang === 'en-US' || lang === 'es-ES';
  }

  private getInitialLanguage(): SupportedLanguage {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && this.isSupported(saved)) {
        return saved as SupportedLanguage;
      }
    } catch (e) {
      console.warn('Could not read language from localStorage', e);
    }
    return 'pt-BR';
  }
}

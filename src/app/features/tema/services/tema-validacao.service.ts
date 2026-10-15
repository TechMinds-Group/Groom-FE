import { Injectable } from '@angular/core';
import {
  TemaCampoCor,
  TemaEditorForm,
  TEMA_DIRECOES_LABELS,
  TEMA_PARES_CONTRASTE,
} from '../models/tema-editor.model';

/** Regex das cores hex (§6.8 — sólida e cor1/cor2 de gradiente). */
export const TEMA_HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** Regex da URL absoluta do logo (§6.8 — decisão 29/09: logo é link externo). */
export const TEMA_LOGO_REGEX = /^https?:\/\//;

/** Contraste mínimo WCAG 2.1 AA para texto normal (RN-101). */
const RATIO_MINIMO = 4.5;

/** Direções válidas do gradiente (CR-001). */
const DIRECOES = TEMA_DIRECOES_LABELS.map((d) => d.valor);

/** Resultado de validação com campo destacável (§6.8 — erro + destaque). */
export interface TemaValidacaoResultado {
  valido: boolean;
  /** Campo/grupo com problema, para destaque visual. */
  campo?: string;
  mensagem?: string;
}

/**
 * Validações do cliente do editor de tema (RN-101/§6.8) — hex, gradiente, tokens,
 * logo e pré-cheque de contraste WCAG AA pelo pior caso (CR-001).
 * O servidor é a autoridade; falhas `Tema.*` do PUT são tratadas pelo editor.
 */
@Injectable()
export class TemaValidacaoService {
  /** Cor no formato #RRGGBB (§6.8). */
  hexValida(cor: string | null | undefined): boolean {
    return !!cor && TEMA_HEX_REGEX.test(cor);
  }

  /** Slot de cor válido: sólido exige hex válida; gradiente exige cor1/cor2 + direção no enum. */
  campoCorValido(campo: TemaCampoCor | undefined): boolean {
    if (!campo) {
      return false;
    }
    if (campo.tipo === 'gradiente') {
      return (
        this.hexValida(campo.cor1) &&
        this.hexValida(campo.cor2) &&
        DIRECOES.includes(campo.direcao)
      );
    }
    return this.hexValida(campo.cor);
  }

  /** URL do logo: vazia é permitida (null = logo padrão); preenchida exige http(s) absoluto. */
  logoUrlValida(url: string): boolean {
    return !url || TEMA_LOGO_REGEX.test(url.trim());
  }

  /** Textarea de tokens deve parsear como objeto JSON (RN-101 — Tema.JsonInvalido). */
  tokensValidos(json: string): boolean {
    if (!json.trim()) {
      return true;
    }
    try {
      const parsed = JSON.parse(json);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }

  /** PorModo exige as 5 cores escuras válidas antes de Salvar (RN-099/101). */
  modoPorModoCompleto(form: TemaEditorForm): boolean {
    return Object.values(form.escuro).every((campo) => this.campoCorValido(campo));
  }

  /** Cores preenchidas em Unica são proibidas (RN-101 — Tema.EscuroEmModoUnica). */
  escuroLimpoEmUnica(form: TemaEditorForm): boolean {
    return Object.values(form.escuro).every(
      (campo) => !campo.cor && !campo.cor1 && !campo.cor2,
    );
  }

  /**
   * Pré-validação de contraste (RN-101/CR-001): pares `texto`×`fundo` e `primaria`×`fundo`
   * (e equivalentes escuros em PorModo), testando o pior caso — todas as combinações entre
   * as cores extremas do gradiente e as cores do par.
   */
  contrasteValido(form: TemaEditorForm): TemaValidacaoResultado {
    for (const par of TEMA_PARES_CONTRASTE) {
      if (par.escuro && form.modoPaleta !== 'PorModo') {
        continue;
      }
      const campoA = par.escuro ? form.escuro[par.a] : form.base[par.a];
      const campoB = par.escuro ? form.escuro[par.b] : form.base[par.b];
      if (!campoA || !campoB || !this.campoCorValido(campoA) || !this.campoCorValido(campoB)) {
        continue;
      }
      const coresA = this.coresExtremas(campoA);
      const coresB = this.coresExtremas(campoB);
      const reprovado = coresA.some(
        (a) => coresB.some((b) => this.razaoContraste(a, b) < RATIO_MINIMO),
      );
      if (reprovado) {
        return {
          valido: false,
          campo: par.escuro ? par.a : par.a,
          mensagem: `Contraste insuficiente entre ${par.a} e ${par.b} (mínimo WCAG AA 4.5:1).`,
        };
      }
    }
    return { valido: true };
  }

  /** Razão de contraste WCAG 2.1 entre duas cores hex (1..21). */
  razaoContraste(a: string, b: string): number {
    const la = this.luminanciaRelativa(a);
    const lb = this.luminanciaRelativa(b);
    const claro = Math.max(la, lb);
    const escuro = Math.min(la, lb);
    return (claro + 0.05) / (escuro + 0.05);
  }

  /** Luminância relativa WCAG (0..1) de uma cor #RRGGBB. */
  luminanciaRelativa(hex: string): number {
    const canal = [1, 3, 5].map((i) => {
      const valor = parseInt(hex.slice(i, i + 2), 16) / 255;
      return valor <= 0.03928 ? valor / 12.92 : Math.pow((valor + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * canal[0] + 0.7152 * canal[1] + 0.0722 * canal[2];
  }

  /** Cores extremas do slot para o pior caso: gradiente → [cor1, cor2]; sólido → [cor]. */
  private coresExtremas(campo: TemaCampoCor): string[] {
    return campo.tipo === 'gradiente' ? [campo.cor1, campo.cor2] : [campo.cor];
  }
}

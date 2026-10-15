/**
 * Modelo de domínio do Tema Visual (RN-098..105 — API_CONTRACTS §19).
 * Espelha os DTOs do backend (`TemaLeituraDto`, `SalvarTemaDto`, `GerarModoOpostoDto`).
 */

/** Modo da paleta (RN-099): única para claro e escuro, ou override por modo. */
export type TemaModoPaleta = 'Unica' | 'PorModo';

/** Direção do gradiente do slot (CR-001). */
export type TemaDirecaoGradiente = 'horizontal' | 'vertical' | 'diagonal';

/** Lado de referência da geração do modo oposto (RN-102). */
export type TemaOrigem = 'claro' | 'escuro';

/** Gradiente de um slot (CR-001): cor1/cor2 em #RRGGBB + direção. */
export interface TemaGradiente {
  cor1: string;
  cor2: string;
  direcao: TemaDirecaoGradiente;
}

/** Gradientes por slot: chaves = campos de cor (base e escuro*); slot ausente = cor sólida. */
export type TemaGradientes = Record<string, TemaGradiente>;

/** Tokens abertos do tema (raio de cantos, sombras...) — objeto JSON livre. */
export type TemaTokens = Record<string, unknown>;

/** Payload comum de leitura (API_CONTRACTS §19.1) — painel, portal público e retorno do PUT. */
export interface TemaLeitura {
  /** false = tema padrão do sistema (fallback RN-100); não é erro. */
  configurado: boolean;
  modoPaleta: TemaModoPaleta | null;
  primaria: string | null;
  secundaria: string | null;
  acento: string | null;
  fundo: string | null;
  texto: string | null;
  /** Override do modo escuro (RN-099) — null quando modoPaleta é Unica. */
  escuroPrimaria: string | null;
  escuroSecundaria: string | null;
  escuroAcento: string | null;
  escuroFundo: string | null;
  escuroTexto: string | null;
  /** URL externa http(s); null = logo padrão (RN-100). */
  logoUrl: string | null;
  fonteTitulo: string | null;
  fonteCorpo: string | null;
  gradientes: TemaGradientes | null;
  tokens: TemaTokens | null;
  atualizadoEm: string | null;
}

/** Payload de gravação (PUT §19.2) — payload comum sem configurado/atualizadoEm. */
export interface TemaGravacao {
  modoPaleta: TemaModoPaleta;
  primaria: string | null;
  secundaria: string | null;
  acento: string | null;
  fundo: string | null;
  texto: string | null;
  escuroPrimaria: string | null;
  escuroSecundaria: string | null;
  escuroAcento: string | null;
  escuroFundo: string | null;
  escuroTexto: string | null;
  logoUrl: string | null;
  fonteTitulo: string | null;
  fonteCorpo: string | null;
  gradientes: TemaGradientes | null;
  tokens: TemaTokens | null;
}

/** Sugestão da paleta do modo oposto (§19.3) — preview only (RN-102), não persiste. */
export interface TemaSugestao {
  modo: string;
  primaria: string | null;
  secundaria: string | null;
  acento: string | null;
  fundo: string | null;
  texto: string | null;
  gradientes: TemaGradientes | null;
}

/** Slots da paleta base, em ordem de exibição (RN-098). */
export const TEMA_SLOTS_BASE = ['primaria', 'secundaria', 'acento', 'fundo', 'texto'] as const;

/** Slots do modo escuro (RN-099), em ordem de exibição. */
export const TEMA_SLOTS_ESCURO = [
  'escuroPrimaria',
  'escuroSecundaria',
  'escuroAcento',
  'escuroFundo',
  'escuroTexto',
] as const;

export type TemaSlotBase = (typeof TEMA_SLOTS_BASE)[number];
export type TemaSlotEscuro = (typeof TEMA_SLOTS_ESCURO)[number];
export type TemaSlot = TemaSlotBase | TemaSlotEscuro;

/** Direções aceitas no select do editor (CR-001). */
export const TEMA_DIRECOES: TemaDirecaoGradiente[] = ['horizontal', 'vertical', 'diagonal'];

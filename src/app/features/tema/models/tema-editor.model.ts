import {
  TemaDirecaoGradiente,
  TemaGradiente,
  TemaGravacao,
  TemaLeitura,
  TemaModoPaleta,
  TemaSlot,
  TEMA_SLOTS_BASE,
  TEMA_SLOTS_ESCURO,
} from '../../../core/models/tema/tema.model';

/** Rótulos de exibição dos slots da paleta base e do modo escuro (RN-098/099). */
export const TEMA_SLOT_LABELS: Record<string, string> = {
  primaria: 'Primária',
  secundaria: 'Secundária',
  acento: 'Acento',
  fundo: 'Fundo',
  texto: 'Texto',
  escuroPrimaria: 'Primária',
  escuroSecundaria: 'Secundária',
  escuroAcento: 'Acento',
  escuroFundo: 'Fundo',
  escuroTexto: 'Texto',
};

/**
 * Legenda de uso real de cada slot no painel/portal (chips "usado em: ..." do editor):
 * primária pinta botões e links; secundária, a barra superior do portal e apoios;
 * acento, destaques/badges; fundo, o fundo das telas; texto, o texto corrente.
 */
export const TEMA_SLOT_USO: Record<string, string> = {
  primaria: 'Botões e links',
  secundaria: 'Topo do portal e elementos de apoio',
  acento: 'Destaques e badges',
  fundo: 'Fundo das telas',
  texto: 'Texto corrente',
};

/** Uso do slot para a legenda do editor — grupos escuros compartilham os usos da base. */
export function usoDeSlot(slot: string): string {
  if (slot.startsWith('escuro')) {
    return TEMA_SLOT_USO[slot.charAt(6).toLowerCase() + slot.slice(7)] ?? '';
  }
  return TEMA_SLOT_USO[slot] ?? '';
}

/** Paleta padrão do sistema (tokens do design system — _tokens.scss) usada no prefill e no preview. */
export const TEMA_CORES_PADRAO: Record<string, string> = {
  primaria: '#0d6efd',
  secundaria: '#6c757d',
  acento: '#f59e0b',
  fundo: '#f8fafc',
  texto: '#0f172a',
};

/** Paleta escura padrão do sistema para slots do modo escuro sem valor no preview (RN-099). */
const TEMA_CORES_PADRAO_ESCURO: Record<string, string> = {
  primaria: '#0d6efd',
  secundaria: '#6c757d',
  acento: '#f59e0b',
  fundo: '#0b0f1a',
  texto: '#f8fafc',
};

/** Config de exibição de um grupo de slots (base ou escuro) na tela do editor. */
export interface TemaGrupoConfig {
  /** Slots do grupo, em ordem de exibição. */
  slots: readonly string[];
  /** prefixo do campo no formulário (base ou escuro). */
  escuro: boolean;
}

/** Grupos de slots do editor: paleta base e cores escuras (PorModo — RN-099). */
export const TEMA_GRUPOS: TemaGrupoConfig[] = [
  { slots: TEMA_SLOTS_BASE, escuro: false },
  { slots: TEMA_SLOTS_ESCURO, escuro: true },
];

/** Tipo de preenchimento do slot (CR-001): cor sólida ou gradiente de duas cores. */
export type TemaTipoCor = 'solido' | 'gradiente';

/** Estado de um slot de cor no formulário do editor (CR-001). */
export interface TemaCampoCor {
  tipo: TemaTipoCor;
  /** Cor sólida; quando gradiente, o backend persiste cor1 (coluna hex). */
  cor: string;
  cor1: string;
  cor2: string;
  direcao: TemaDirecaoGradiente;
}

/** Estado de formulário do editor de tema (UI_SPEC §5.30/§6.8). */
export interface TemaEditorForm {
  modoPaleta: TemaModoPaleta;
  base: Record<string, TemaCampoCor>;
  escuro: Record<string, TemaCampoCor>;
  logoUrl: string;
  fonteTitulo: string;
  fonteCorpo: string;
  /** Texto cru do textarea JSON — parse validado no cliente (RN-101). */
  tokensJson: string;
}

/** Pares de contraste avaliados no cliente (WCAG AA 4.5:1 — pior caso com gradiente, CR-001). */
export const TEMA_PARES_CONTRASTE: { a: string; b: string; escuro: boolean }[] = [
  { a: 'texto', b: 'fundo', escuro: false },
  { a: 'primaria', b: 'fundo', escuro: false },
  { a: 'escuroTexto', b: 'escuroFundo', escuro: true },
  { a: 'escuroPrimaria', b: 'escuroFundo', escuro: true },
];

/** Direções aceitas no select de gradiente, com rótulo. */
export const TEMA_DIRECOES_LABELS: { valor: TemaDirecaoGradiente; label: string }[] = [
  { valor: 'horizontal', label: 'Horizontal' },
  { valor: 'vertical', label: 'Vertical' },
  { valor: 'diagonal', label: 'Diagonal' },
];

/** Constrói o estado de um slot a partir de cor sólida + gradiente opcional (CR-001). */
export function campoCorDe(cor: string | null, gradiente: TemaGradiente | undefined): TemaCampoCor {
  if (gradiente) {
    return { tipo: 'gradiente', cor: gradiente.cor1, cor1: gradiente.cor1, cor2: gradiente.cor2, direcao: gradiente.direcao };
  }
  return { tipo: 'solido', cor: cor ?? '', cor1: cor ?? '', cor2: '', direcao: 'horizontal' };
}

/** Cria campos vazios (sólidos, sem cor) para um grupo de slots. */
export function criarCamposVazios(slots: readonly string[]): Record<string, TemaCampoCor> {
  const grupo: Record<string, TemaCampoCor> = {};
  for (const slot of slots) {
    grupo[slot] = { tipo: 'solido', cor: '', cor1: '', cor2: '', direcao: 'horizontal' };
  }
  return grupo;
}

/** Rótulo de exibição do slot — grupos escuros compartilham os rótulos da base (RN-099). */
export function labelDeSlot(slot: string): string {
  if (slot.startsWith('escuro')) {
    return TEMA_SLOT_LABELS[slot.charAt(6).toLowerCase() + slot.slice(7)] ?? slot;
  }
  return TEMA_SLOT_LABELS[slot] ?? slot;
}

/** Monta o formulário a partir do payload de leitura (RN-098-8 — editor carrega o tema salvo). */
export function formDePayload(tema: TemaLeitura, prefillBase: Record<string, string>): TemaEditorForm {
  const gradientes = tema.gradientes ?? {};
  const montarGrupo = (slots: readonly string[]): Record<string, TemaCampoCor> => {
    const grupo: Record<string, TemaCampoCor> = {};
    for (const slot of slots) {
      const slotPayload = slot as TemaSlot;
      const cor = tema[slotPayload] ?? (slots === TEMA_SLOTS_BASE ? prefillBase[slot] ?? '' : '');
      grupo[slot] = campoCorDe(cor, gradientes[slotPayload]);
    }
    return grupo;
  };

  return {
    modoPaleta: tema.modoPaleta ?? 'Unica',
    base: montarGrupo(TEMA_SLOTS_BASE),
    escuro: montarGrupo(TEMA_SLOTS_ESCURO),
    logoUrl: tema.logoUrl ?? '',
    fonteTitulo: tema.fonteTitulo ?? '',
    fonteCorpo: tema.fonteCorpo ?? '',
    tokensJson: tema.tokens ? JSON.stringify(tema.tokens, null, 2) : '',
  };
}

/** Constrói o payload de gravação (PUT §19.2) a partir do formulário (CR-001: coluna hex persiste cor1). */
export function payloadDeForm(form: TemaEditorForm): TemaGravacao {
  const gradientes: Record<string, TemaGradiente> = {};
  const corDoCampo = (campo: TemaCampoCor): string =>
    campo.tipo === 'gradiente' ? campo.cor1 : campo.cor;

  const montarGrupo = (
    slots: readonly string[],
    campos: Record<string, TemaCampoCor>,
    incluir: boolean,
  ): Record<string, string | null> => {
    const grupo: Record<string, string | null> = {};
    for (const slot of slots) {
      if (slots === TEMA_SLOTS_ESCURO && !incluir) {
        grupo[slot as TemaSlot] = null;
        continue;
      }
      const campo = campos[slot];
      if (campo && campo.tipo === 'gradiente') {
        gradientes[slot as TemaSlot] = {
          cor1: campo.cor1,
          cor2: campo.cor2,
          direcao: campo.direcao,
        };
      }
      grupo[slot as TemaSlot] = corDoCampo(campo) || null;
    }
    return grupo;
  };

  const incluirEscuro = form.modoPaleta === 'PorModo';
  const coresBase = montarGrupo(TEMA_SLOTS_BASE, form.base, true);
  const coresEscuro = montarGrupo(TEMA_SLOTS_ESCURO, form.escuro, incluirEscuro);

  return {
    modoPaleta: form.modoPaleta,
    primaria: coresBase['primaria'] ?? null,
    secundaria: coresBase['secundaria'] ?? null,
    acento: coresBase['acento'] ?? null,
    fundo: coresBase['fundo'] ?? null,
    texto: coresBase['texto'] ?? null,
    escuroPrimaria: coresEscuro['escuroPrimaria'] ?? null,
    escuroSecundaria: coresEscuro['escuroSecundaria'] ?? null,
    escuroAcento: coresEscuro['escuroAcento'] ?? null,
    escuroFundo: coresEscuro['escuroFundo'] ?? null,
    escuroTexto: coresEscuro['escuroTexto'] ?? null,
    logoUrl: form.logoUrl.trim() || null,
    fonteTitulo: form.fonteTitulo.trim() || null,
    fonteCorpo: form.fonteCorpo.trim() || null,
    gradientes: Object.keys(gradientes).length ? gradientes : null,
    tokens: parseTokens(form.tokensJson),
  };
}

/**
 * Monta o payload de leitura sintético para o preview ao vivo (UI_SPEC §5.30 — atualiza
 * a cada mudança). O preview é SEMPRE fiel ao formulário: slots vazios caem na paleta
 * padrão do sistema (mesma do prefill — RN-100), inclusive sem tema configurado — o
 * mock não herda o modo escuro do painel quando a paleta em edição é clara (RN-099:
 * com Unica a mesma paleta vale para claro e escuro).
 */
export function temaPreviewDeForm(form: TemaEditorForm): TemaLeitura {
  // Preview tolerante: JSON de tokens inválido/incompleto não pode quebrar o preview ao
  // vivo — o payload é remontado sem tokens (payloadDeForm lança no parse — RN-101).
  let payload: TemaGravacao;
  try {
    payload = payloadDeForm(form);
  } catch {
    payload = payloadDeForm({ ...form, tokensJson: '' });
  }

  const corPreview = (valor: string | null, padrao: string): string =>
    valor?.trim() ? valor : padrao;

  const cores: Record<string, string | null> = {
    primaria: corPreview(payload.primaria, TEMA_CORES_PADRAO['primaria']),
    secundaria: corPreview(payload.secundaria, TEMA_CORES_PADRAO['secundaria']),
    acento: corPreview(payload.acento, TEMA_CORES_PADRAO['acento']),
    fundo: corPreview(payload.fundo, TEMA_CORES_PADRAO['fundo']),
    texto: corPreview(payload.texto, TEMA_CORES_PADRAO['texto']),
    escuroPrimaria: corPreview(payload.escuroPrimaria, TEMA_CORES_PADRAO_ESCURO['primaria']),
    escuroSecundaria: corPreview(payload.escuroSecundaria, TEMA_CORES_PADRAO_ESCURO['secundaria']),
    escuroAcento: corPreview(payload.escuroAcento, TEMA_CORES_PADRAO_ESCURO['acento']),
    escuroFundo: corPreview(payload.escuroFundo, TEMA_CORES_PADRAO_ESCURO['fundo']),
    escuroTexto: corPreview(payload.escuroTexto, TEMA_CORES_PADRAO_ESCURO['texto']),
  };

  // RN-099: em Unica o grupo escuro não existe — o preview usa a mesma paleta nos dois modos.
  if (form.modoPaleta === 'Unica') {
    cores['escuroPrimaria'] = null;
    cores['escuroSecundaria'] = null;
    cores['escuroAcento'] = null;
    cores['escuroFundo'] = null;
    cores['escuroTexto'] = null;
  }

  return {
    configurado: true,
    ...payload,
    ...cores,
    atualizadoEm: null,
  };
}

/** Preenche o grupo escuro com a sugestão do modo oposto (RN-102 — cores + gradientes convertidos). */
export function camposEscurosDeSugestao(
  sugestao: Pick<TemaLeitura, 'primaria' | 'secundaria' | 'acento' | 'fundo' | 'texto' | 'gradientes'>,
): Record<string, TemaCampoCor> {
  const gradientes = sugestao.gradientes ?? {};
  // A sugestão nomeia as cores como base (primaria...); o grupo escuro usa escuro*.
  const coresDaSugestao: Record<string, string | null> = {
    primaria: sugestao.primaria,
    secundaria: sugestao.secundaria,
    acento: sugestao.acento,
    fundo: sugestao.fundo,
    texto: sugestao.texto,
  };
  const grupo: Record<string, TemaCampoCor> = {};
  for (const slot of TEMA_SLOTS_ESCURO) {
    const chaveBase = slot.charAt(6).toLowerCase() + slot.slice(7);
    const gradiente = gradientes[chaveBase];
    grupo[slot] = campoCorDe(coresDaSugestao[chaveBase] ?? '', gradiente);
  }
  return grupo;
}

/** Parse do textarea de tokens; null quando vazio (RN-101 — valida no cliente antes). */
export function parseTokens(json: string): Record<string, unknown> | null {
  if (!json.trim()) {
    return null;
  }
  return JSON.parse(json) as Record<string, unknown>;
}

/**
 * Mapeia códigos de erro `Tema.*` do servidor (ERROR_CATALOG) para o campo/grupo
 * destacado no editor (§6.8 — toast + destaque mantendo as edições).
 */
export const TEMA_ERRO_CAMPO: Record<string, string> = {
  'Tema.CorInvalida': 'cores',
  'Tema.GradientInvalido': 'gradientes',
  'Tema.JsonInvalido': 'tokens',
  'Tema.ModoPorModoIncompleto': 'escuro',
  'Tema.EscuroEmModoUnica': 'modo',
  'Tema.LogoUrlInvalida': 'logoUrl',
  'Tema.ContrasteInsuficiente': 'contraste',
};


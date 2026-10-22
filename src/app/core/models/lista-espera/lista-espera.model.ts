/**
 * Lista de espera do portal do cliente (RN-074 — API_CONTRACTS §15.1).
 * Campos espelham o `ListaEsperaItemDto` do backend — não renomear.
 */

/** Preferências opcionais ao entrar na lista (null = sem preferência). */
export interface EntrarListaEsperaPayload {
  /** Dia da lista "YYYY-MM-DD" — o dia navegado no portal (hoje ou futuro). Null = hoje. Espelha `DataLista` do comando. */
  dataLista?: string | null;
  servicoId?: string | null;
  profissionalId?: string | null;
  /** Janela mínima de aviso em "HH:mm" — vagas apenas a partir desta hora (UTC-3 — DEC-002). */
  horaJanelaInicio?: string | null;
  /**
   * Fim da janela em "HH:mm" (RN-074 — horário específico): slot clicado envia início+fim
   * (vale só aquele horário); null = sem limite superior ("a partir de" — dia lotado).
   */
  horaJanelaFim?: string | null;
}

/**
 * Payload da recepção para adicionar um cliente à lista do dia (staff — API_CONTRACTS §15.2).
 * Diferente do portal, `clienteId` é obrigatório; os demais campos são opcionais
 * (`profissionalId` null = "Qualquer profissional" — RN-042).
 */
export interface AdicionarListaEsperaPayload {
  clienteId: string;
  servicoId?: string | null;
  profissionalId?: string | null;
  horaJanelaInicio?: string | null;
}

/** Resposta 201 do POST staff de entrada — campos espelham o DTO do backend (não renomear). */
export interface ListaEsperaCriada {
  id: string;
  clienteId: string;
  posicao: number;
  status: string;
  criadaEmUtc: string;
}

/** Reserva temporária do slot vagado, ofertada à entrada (RN-075/076). */
export interface ListaEsperaReserva {
  reservaId: string;
  slotInicio: string;
  slotFim: string;
  profissionalId?: string | null;
  profissionalNome: string;
  expiraEmUtc: string;
  /** RN-074 — serviço preferido da entrada (fila por horário); fallback = serviço do slot vagado. */
  servicoId?: string | null;
  servicoNome?: string | null;
}

/** Entrada ativa do cliente na lista do dia, com posição FIFO calculada em leitura. */
export interface ListaEsperaItem {
  id: string;
  clienteId: string;
  clienteNome: string;
  posicao: number;
  servicoId?: string | null;
  servicoNome?: string | null;
  profissionalId?: string | null;
  profissionalNome?: string | null;
  horaJanelaInicio?: string | null;
  horaJanelaFim?: string | null;
  status: string;
  criadaEmUtc: string;
  reservaAtiva?: ListaEsperaReserva | null;
}

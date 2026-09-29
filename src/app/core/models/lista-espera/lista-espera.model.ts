/**
 * Lista de espera do portal do cliente (RN-074 — API_CONTRACTS §15.1).
 * Campos espelham o `ListaEsperaItemDto` do backend — não renomear.
 */

/** Preferências opcionais ao entrar na lista (null = sem preferência). */
export interface EntrarListaEsperaPayload {
  servicoId?: string | null;
  profissionalId?: string | null;
  /** Janela mínima de aviso em "HH:mm" — vagas apenas a partir desta hora (UTC-3 — DEC-002). */
  horaJanelaInicio?: string | null;
}

/** Reserva temporária do slot vagado, ofertada à entrada (RN-075/076). */
export interface ListaEsperaReserva {
  reservaId: string;
  slotInicio: string;
  slotFim: string;
  profissionalNome: string;
  expiraEmUtc: string;
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
  status: string;
  criadaEmUtc: string;
  reservaAtiva?: ListaEsperaReserva | null;
}

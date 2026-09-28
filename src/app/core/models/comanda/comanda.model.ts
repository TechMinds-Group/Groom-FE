/** Status possível de uma comanda. */
export type ComandaStatus = 'Aberta' | 'Fechada' | 'Cancelada';

/** Tipo de desconto aplicado no fechamento. */
export type TipoDesconto = 'percentual' | 'valor';

/**
 * Comanda (contrato ComandaDTO do backend).
 * `itens` é `null` quando a comanda não possui itens — tratar como lista vazia no FE.
 */
export interface Comanda {
  id: string;
  numero: number;
  clienteId?: string;
  clienteNome?: string;
  agendamentoId?: string;
  status: ComandaStatus;
  valorTotal: number;
  valorDesconto: number;
  tipoDesconto?: TipoDesconto | null;
  valorFinal: number;
  observacoes?: string;
  fechadaEmUtc?: string | null;
  /** RN-069 — CR-001: null indica fechamento automático pelo sistema. */
  fechadaPorUsuarioId?: string | null;
  canceladaEmUtc?: string | null;
  itemCount?: number;
  itens?: ComandaItem[] | null;
  createdAtUtc: string;
}

/** Item de comanda (contrato ComandaItemDTO — o nome do profissional é resolvido no FE pelo `profissionalId`). */
export interface ComandaItem {
  id: string;
  comandaId: string;
  tipo: 'produto' | 'servico';
  produtoId?: string;
  servicoId?: string;
  profissionalId?: string;
  nomeItem: string;
  quantidade: number;
  precoUnitario: number;
  precoTotal: number;
  observacoes?: string;
}

export interface CriarComandaAvulsaRequest {
  clienteId?: string;
  clienteNome?: string;
  observacoes?: string;
}

export interface AdicionarProdutoRequest {
  produtoId: string;
  quantidade: number;
  observacoes?: string;
}

export interface AdicionarServicoRequest {
  servicoId: string;
  profissionalId: string;
  observacoes?: string;
}

export interface FecharComandaRequest {
  desconto?: {
    tipo: TipoDesconto;
    valor: number;
  };
  observacoes?: string;
}

/** Filtros do histórico (GET /comandas/historico). */
export interface FiltrosHistoricoComanda {
  clienteId?: string;
  dataInicio?: string;
  dataFim?: string;
  profissionalId?: string;
}

/** Corpo de resposta de operações que retornam apenas mensagem (ex.: remoção de item). */
export interface MensagemApi {
  message: string;
}

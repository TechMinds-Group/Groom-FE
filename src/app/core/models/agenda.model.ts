export type AgendamentoStatus = 'pendente' | 'agendado' | 'confirmado' | 'recusado' | 'concluido' | 'no-show' | 'cancelado' | 'nao_compareceu';

export const CORES_STATUS: Record<AgendamentoStatus, string> = {
  pendente: '#7c3aed',
  agendado: '#7c3aed',
  confirmado: '#198754',
  recusado: '#ef4444',
  concluido: '#0d6efd',
  'no-show': '#dc2626',
  cancelado: '#6c757d',
  nao_compareceu: '#dc2626',
};

export interface Agendamento {
  id: string;
  clienteId?: string;
  clienteNome: string;
  clienteTelefone: string;
  servicoId?: string;
  servicoNome: string;
  profissionalId: string;
  profissionalNome: string;
  dataInicio: Date;
  dataFim: Date;
  status: AgendamentoStatus;
  preco: number;
  corPrimaria?: string;
  observacoes?: string;
  tipo?: string;
  planoId?: string;
  planoNome?: string;
}

/**
 * Monta um Date local a partir do ISO da API sem converter fuso.
 * Convenção do projeto: horários são tratados como hora local do estabelecimento
 * (o backend serializa como UTC apenas por convenção, sem normalização de fuso).
 */
export function agendamentoParaDateLocal(valor: string | Date): Date {
  if (valor instanceof Date) return valor;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valor);
  if (!m) return new Date(valor);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

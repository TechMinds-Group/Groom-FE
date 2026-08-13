export type AgendamentoStatus = 'pendente' | 'agendado' | 'confirmado' | 'recusado' | 'concluido' | 'no-show' | 'cancelado';

export const CORES_STATUS: Record<AgendamentoStatus, string> = {
  pendente: '#6c757d',
  agendado: '#fd7e14',
  confirmado: '#198754',
  recusado: '#dc3545',
  concluido: '#0d6efd',
  'no-show': '#495057',
  cancelado: '#6c757d',
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
}

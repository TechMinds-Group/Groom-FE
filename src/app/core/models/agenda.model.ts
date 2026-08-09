export type AgendamentoStatus = 'pendente' | 'confirmado' | 'concluido' | 'no-show';

export interface Agendamento {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
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

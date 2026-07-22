export interface PagamentoAssinante {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  status: 'Pago' | 'Pendente' | 'Cancelado';
}

export interface AssinanteDetalhes {
  id: string;
  clienteNome: string;
  clienteEmail: string;
  telefone: string;
  clubeNome: string;
  valorAssinatura: number;
  status: 'Ativo' | 'Pendente' | 'Expirado';
  dataInicio: string;
  dataRenovacao: string;
  receitaGeradaLtv: number;
  historicoPagamentos: PagamentoAssinante[];
}

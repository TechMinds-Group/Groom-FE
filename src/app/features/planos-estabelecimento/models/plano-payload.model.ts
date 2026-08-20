export interface PlanoPayload {
  nome: string;
  preco: number;
  frequencia: string;
  descricao: string;
  recursos: string[];
  status: 'Ativo' | 'Inativo';
}
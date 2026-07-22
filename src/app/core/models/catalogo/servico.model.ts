export interface ServicoCatalogo {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  duracao?: number;
  status: 'Ativo' | 'Inativo';
}
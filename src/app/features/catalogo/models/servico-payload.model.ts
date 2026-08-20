export interface ServicoPayload {
  nome: string;
  preco: number;
  duracao?: number | null;
  status: string;
}
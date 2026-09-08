export interface ServicoPayload {
  nome: string;
  descricao?: string | null;
  preco: number;
  duracao?: number | null;
  status: string;
  imagemUrl?: string | null;
  imagemUrl2?: string | null;
  imagemUrl3?: string | null;
}
export interface PlanoPayload {
  nome: string;
  preco: number;
  frequencia: string;
  descricao: string;
  recursos: string[];
  status: 'Ativo' | 'Inativo';
  imagemUrl?: string | null;
  imagemUrl2?: string | null;
  imagemUrl3?: string | null;
}
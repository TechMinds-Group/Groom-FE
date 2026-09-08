export interface ServicoCatalogo {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  duracao?: number;
  status: 'Ativo' | 'Inativo';
  imagemUrl?: string | null;
  imagemUrl2?: string | null;
  imagemUrl3?: string | null;
}
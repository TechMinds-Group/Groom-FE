export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  perfil: string;
  perfilCorHex: string;
  perfilIconeClass: string;
  nivelAcessoId?: string;
  secundarioNivelAcessoId?: string | null;
  status: 'Ativo' | 'Inativo';
  faturamento?: number;
  planoAssinatura?: string;
}

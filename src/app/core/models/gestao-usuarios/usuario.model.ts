export interface Usuario {
  id: string;
  nome: string;
  sobrenome?: string;
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
  plano?: string;
  fotoUrl?: string;
}

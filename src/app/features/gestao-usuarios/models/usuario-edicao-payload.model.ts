export interface UsuarioEdicaoPayload {
  nome: string;
  sobrenome: string;
  email: string;
  telefone?: string;
  status: string;
  nivelAcessoId: string;
  secundarioNivelAcessoId?: string | null;
  plano?: string;
}
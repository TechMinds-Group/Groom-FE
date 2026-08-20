export interface ClienteEdicaoPayload {
  primeiroNome: string;
  sobrenome: string;
  celular: string;
  email?: string;
  cpf?: string;
  dataNascimento?: string;
  observacoes?: string;
  status?: string;
}

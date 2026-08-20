export interface Cliente {
  id: string;
  nome: string;
  primeiroNome?: string;
  sobrenome?: string;
  email?: string;
  celular: string;
  cpf?: string;
  dataNascimento?: string;
  observacoes?: string;
  status: 'Ativo' | 'Inativo';
}
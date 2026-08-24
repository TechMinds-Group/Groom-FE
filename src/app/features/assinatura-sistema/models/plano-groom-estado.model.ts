import { StatusAssinatura } from '../enums/status-assinatura.enum';

/** Estado reativo dos detalhes e limites da assinatura do sistema */
export interface PlanoGroomEstado {
  nome: string;
  valor: number;
  ciclo: string;
  status: StatusAssinatura;
  validoAte: string | null;
  diasRestantes: number;
  usoProfissionais: number;
  limiteProfissionais: number;
  usoClientes: number;
  limiteClientes: number;
}

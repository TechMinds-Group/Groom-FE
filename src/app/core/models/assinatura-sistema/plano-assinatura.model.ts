/**
 * Interface que representa um plano de assinatura do sistema com seus detalhes, limites e consumos.
 */
export interface PlanoAssinatura {
  id: string;
  nome: string;
  valor: number;
  ciclo: string;
  status: string;
  limiteProfissionais: number;
  limiteClientes: number;
  limiteClientesAssinantes: number;
  usoProfissionais: number;
  usoClientes: number;
  usoClientesAssinantes: number;
  validoAte?: string;
  diasRestantes?: number;
}

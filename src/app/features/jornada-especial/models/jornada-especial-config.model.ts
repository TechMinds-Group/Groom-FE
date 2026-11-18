/**
 * Configurações e tipos específicos da feature de Jornadas Especiais (RN-147).
 * Modelo de domínio compartilhado fica em `core/models/configuracoes/jornada-especial.model.ts`.
 */

/** Valor do filtro de escopo quando todas as exceções estão visíveis. */
export const ESCOPO_TODOS = 'todos';

/** Valor do filtro de escopo para exceções que valem para o estabelecimento inteiro (RN-111). */
export const ESCOPO_ESTABELECIMENTO = 'estabelecimento';

/** Horário padrão de abertura aplicado quando o campo vier vazio (mesma semântica da API — RN-111). */
export const HORA_ABERTURA_PADRAO = '08:00';

/** Horário padrão de fechamento aplicado quando o campo vier vazio (mesma semântica da API — RN-111). */
export const HORA_FECHAMENTO_PADRAO = '18:00';

/** Opção enxuta de profissional para os selects de escopo (filtro da listagem e formulário). */
export interface ProfissionalOpcao {
  id: string;
  nome: string;
}

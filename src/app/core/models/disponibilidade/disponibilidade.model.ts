import { Agendamento } from '../agenda.model';

/** Intervalo de horário configurado para um dia de trabalho. Horas no formato "HH:mm". */
export interface IntervaloDisponibilidade {
  horaInicio: string;
  horaFim: string;
}

/** Configuração de um dia da semana (0 = Domingo ... 6 = Sábado, valores de DayOfWeek do .NET). */
export interface DiaDisponibilidade {
  diaSemana: number;
  trabalhaHoje: boolean;
  intervalos: IntervaloDisponibilidade[];
}

/** Estado completo da disponibilidade de um profissional (enviado via GET/PUT /disponibilidade). */
export interface DisponibilidadeProfissional {
  profissionalId: string;
  dias: DiaDisponibilidade[];
  servicoIds: string[];
  planoIds?: string[];
}

/** Resultado do salvamento; conflitos lista agendamentos que ficam fora dos novos horários (não bloqueia o save). */
export interface SalvarDisponibilidadeResult {
  conflitos: Agendamento[];
}

/** Rótulos dos dias da semana (pt-BR) para o formulário de disponibilidade. */
export const DIAS_SEMANA: Record<number, { label: string; abreviacao: string }> = {
  0: { label: 'Domingo', abreviacao: 'Dom' },
  1: { label: 'Segunda-feira', abreviacao: 'Seg' },
  2: { label: 'Terça-feira', abreviacao: 'Ter' },
  3: { label: 'Quarta-feira', abreviacao: 'Qua' },
  4: { label: 'Quinta-feira', abreviacao: 'Qui' },
  5: { label: 'Sexta-feira', abreviacao: 'Sex' },
  6: { label: 'Sábado', abreviacao: 'Sáb' },
};

export const AGENDAMENTO_PUBLICO_CONFIG = {
  passos: [
    { label: 'Profissional' },
    { label: 'Serviço' },
    { label: 'Data e horário' },
    { label: 'Resumo' },
  ],
} as const;

export type PassoAgendamento = number;

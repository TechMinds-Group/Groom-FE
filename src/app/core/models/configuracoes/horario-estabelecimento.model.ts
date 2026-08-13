export interface DiaFuncionamento {
  diaSemana: number; // 0 = Dom, 1 = Seg ... 6 = Sáb
  ativo: boolean;
  horaAbertura: string; // HH:mm
  horaFechamento: string; // HH:mm
  temIntervalo: boolean;
  intervaloInicio?: string; // HH:mm
  intervaloFim?: string; // HH:mm
}

export const DIAS_SEMANA_ESTABELECIMENTO: Record<number, { label: string; abreviacao: string }> = {
  0: { label: 'Domingo', abreviacao: 'Dom' },
  1: { label: 'Segunda-feira', abreviacao: 'Seg' },
  2: { label: 'Terça-feira', abreviacao: 'Ter' },
  3: { label: 'Quarta-feira', abreviacao: 'Qua' },
  4: { label: 'Quinta-feira', abreviacao: 'Qui' },
  5: { label: 'Sexta-feira', abreviacao: 'Sex' },
  6: { label: 'Sábado', abreviacao: 'Sáb' },
};

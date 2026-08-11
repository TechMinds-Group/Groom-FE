import { DIAS_SEMANA } from '../../../core/models/disponibilidade/disponibilidade.model';

/** Configuração de um dia da semana no formulário (derivada de DIAS_SEMANA). */
export interface DiaDisponibilidadeFormConfig {
  diaSemana: number;
  /** Chave i18n do rótulo do dia (ex: 'DISPONIBILIDADE.DIAS_SEMANA.D0'). */
  i18nKey: string;
}

/** Dias da semana na ordem do formulário (0 = Domingo ... 6 = Sábado). */
export const DIAS_SEMANA_FORM: ReadonlyArray<DiaDisponibilidadeFormConfig> = Object.keys(
  DIAS_SEMANA,
).map((dia) => ({
  diaSemana: Number(dia),
  i18nKey: `DISPONIBILIDADE.DIAS_SEMANA.D${dia}`,
}));

/** Intervalo sugerido ao adicionar um novo intervalo no formulário. */
export const INTERVALO_PADRAO: Readonly<{ horaInicio: string; horaFim: string }> = {
  horaInicio: '09:00',
  horaFim: '18:00',
};

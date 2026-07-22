import { ptBR } from './pt-BR';

export type TranslationSchema = typeof ptBR;

type NestedKeys<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.${NestedKeys<T[K]>}`
        : K;
    }[keyof T & string]
  : '';

export type TxKey = NestedKeys<TranslationSchema>;

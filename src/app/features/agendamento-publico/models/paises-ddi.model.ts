/** País com código DDI para o select de código do país do portal (RN-074). */
export interface PaisDdi {
  nome: string;
  ddi: string;
}

/**
 * RN-074 — lista de países/códigos DDI do select de código do país (cadastro e
 * finalização de cadastro do portal). Brasil primeiro; ordenação alfabética nos demais.
 */
export const PAISES_DDI: readonly PaisDdi[] = [
  { nome: 'Brasil', ddi: '55' },
  { nome: 'Argentina', ddi: '54' },
  { nome: 'Bolívia', ddi: '591' },
  { nome: 'Canadá', ddi: '1' },
  { nome: 'Chile', ddi: '56' },
  { nome: 'Colômbia', ddi: '57' },
  { nome: 'Costa Rica', ddi: '506' },
  { nome: 'Cuba', ddi: '53' },
  { nome: 'Equador', ddi: '593' },
  { nome: 'El Salvador', ddi: '503' },
  { nome: 'Guatemala', ddi: '502' },
  { nome: 'Haiti', ddi: '509' },
  { nome: 'Honduras', ddi: '504' },
  { nome: 'México', ddi: '52' },
  { nome: 'Nicarágua', ddi: '505' },
  { nome: 'Panamá', ddi: '507' },
  { nome: 'Paraguai', ddi: '595' },
  { nome: 'Peru', ddi: '51' },
  { nome: 'República Dominicana', ddi: '1' },
  { nome: 'Uruguai', ddi: '598' },
  { nome: 'Venezuela', ddi: '58' },
  { nome: 'Alemanha', ddi: '49' },
  { nome: 'Áustria', ddi: '43' },
  { nome: 'Bélgica', ddi: '32' },
  { nome: 'Croácia', ddi: '385' },
  { nome: 'Dinamarca', ddi: '45' },
  { nome: 'Espanha', ddi: '34' },
  { nome: 'Estônia', ddi: '372' },
  { nome: 'Finlândia', ddi: '358' },
  { nome: 'França', ddi: '33' },
  { nome: 'Grécia', ddi: '30' },
  { nome: 'Holanda', ddi: '31' },
  { nome: 'Hungria', ddi: '36' },
  { nome: 'Irlanda', ddi: '353' },
  { nome: 'Itália', ddi: '39' },
  { nome: 'Noruega', ddi: '47' },
  { nome: 'Polônia', ddi: '48' },
  { nome: 'Portugal', ddi: '351' },
  { nome: 'Reino Unido', ddi: '44' },
  { nome: 'República Tcheca', ddi: '420' },
  { nome: 'Romênia', ddi: '40' },
  { nome: 'Suécia', ddi: '46' },
  { nome: 'Suíça', ddi: '41' },
  { nome: 'África do Sul', ddi: '27' },
  { nome: 'Angola', ddi: '244' },
  { nome: 'Cabo Verde', ddi: '238' },
  { nome: 'Moçambique', ddi: '258' },
  { nome: 'China', ddi: '86' },
  { nome: 'Coreia do Sul', ddi: '82' },
  { nome: 'Emirados Árabes Unidos', ddi: '971' },
  { nome: 'Índia', ddi: '91' },
  { nome: 'Japão', ddi: '81' },
  { nome: 'Israel', ddi: '972' },
  { nome: 'Rússia', ddi: '7' },
  { nome: 'Turquia', ddi: '90' },
  { nome: 'Austrália', ddi: '61' },
  { nome: 'Nova Zelândia', ddi: '64' },
  { nome: 'Estados Unidos', ddi: '1' },
];

/** Opção pronta para o tm-select (label exibe DDI + país). */
export interface PaisDdiOption {
  label: string;
  value: string;
}

/** Converte a lista de países em opções para o tm-select (RN-074). */
export function paraOpcoesPais(paises: readonly PaisDdi[] = PAISES_DDI): PaisDdiOption[] {
  return paises.map((pais) => ({
    label: `+${pais.ddi} — ${pais.nome}`,
    value: pais.ddi,
  }));
}

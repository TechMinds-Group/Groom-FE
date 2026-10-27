import { SalvarAniversarioConfigCommand } from '../../services/aniversariantes.service';

/** Textos padrão do parabéns — espelho dos defaults do backend (RN-050/079/CR-004). */
export const MENSAGEM_PADRAO_COM_CUPOM =
  '🎉 Parabéns, {nome}! A equipe do {estabelecimento} deseja um feliz aniversário.\n\n' +
  'Presente nosso: {percentual}% de desconto nos serviços, válido por {validade} dias. Use o cupom {codigo} ao agendar.';

export const MENSAGEM_PADRAO_SEM_CUPOM =
  '🎉 Parabéns, {nome}! A equipe do {estabelecimento} deseja um feliz aniversário.';

/** Nome do estabelecimento exibido no preview quando ainda não carregado. */
export const ESTABELECIMENTO_PREVIEW_FALLBACK = 'nosso estabelecimento';

/** Janela do envio manual de parabéns: dia do aniversário + até 7 dias depois (envio atrasado). */
export const DIAS_JANELA_ENVIO_MANUAL = 7;

/** Hora padrão do envio automático (fuso de Brasília, 24h) — espelho do default do backend. */
export const HORA_ENVIO_PADRAO = '10:00';

/** Formato aceito para a hora do envio automático: 24h "HH:mm" (00:00 a 23:59). */
export const PADRAO_HORA_ENVIO = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Botão de envio manual ativo apenas no dia do aniversário e por até 7 dias depois
 * (envio atrasado). Compara dia/mês no ano corrente em horário local (Brasília no
 * dispositivo do usuário), sem conversão de fuso.
 */
export function envioParabensDisponivel(dataNascimento: string | null | undefined, referencia: Date = new Date()): boolean {
  if (!dataNascimento) {
    return false;
  }

  const partes = dataNascimento.split('-').map(Number);
  if (partes.length < 3 || partes.some((parte) => Number.isNaN(parte))) {
    return false;
  }

  const inicioHoje = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate()).getTime();
  const aniversarioEsteAno = new Date(referencia.getFullYear(), partes[1] - 1, partes[2]).getTime();
  const diffDias = Math.floor((inicioHoje - aniversarioEsteAno) / 86400000);

  return diffDias >= 0 && diffDias <= DIAS_JANELA_ENVIO_MANUAL;
}

/** Placeholders suportados na mensagem configurável (RN-079). */
export const PLACEHOLDERS_MENSAGEM: string[] = ['{nome}', '{estabelecimento}', '{percentual}', '{validade}', '{codigo}'];

/** Dados do cliente selecionado para o modal de envio de parabéns. */
export interface ClienteParabensPreview {
  clienteId: string;
  nome: string;
}

/** Monta o preview da mensagem como o backend enviará (mesma ordem de regras — RN-079). */
export function montarPreviewMensagem(
  mensagemConfig: string | null | undefined,
  percentual: number,
  validadeDias: number | null,
  nomeEstabelecimento?: string | null,
  nomeCliente?: string | null,
): string {
  const comCupom = percentual > 0 && !!validadeDias;
  const textoBase =
    mensagemConfig && mensagemConfig.trim().length > 0
      ? mensagemConfig
      : comCupom
        ? MENSAGEM_PADRAO_COM_CUPOM
        : MENSAGEM_PADRAO_SEM_CUPOM;

  // split/join troca TODAS as ocorrências de cada placeholder (String.replace troca só a primeira).
  const substituicoes: Array<[string, string]> = [
    ['{nome}', nomeCliente?.trim() || 'Maria'],
    ['{estabelecimento}', nomeEstabelecimento?.trim() || ESTABELECIMENTO_PREVIEW_FALLBACK],
    ['{percentual}', comCupom ? String(percentual) : ''],
    ['{validade}', comCupom ? String(validadeDias) : ''],
    ['{codigo}', comCupom ? 'ANIV-EXEMPLO1' : ''],
  ];

  return substituicoes.reduce((texto, [marcador, valor]) => texto.split(marcador).join(valor), textoBase);
}

/** Converte a config do formulário no comando de salvamento (desconto 0 zera a validade — RN-080). */
export function montarComandoSalvar(
  mensagem: string | null,
  percentual: number,
  validadeDias: number | null,
  envioAutomatico: boolean,
  coletaDataNascimento: boolean,
  horaEnvioAutomatico: string = HORA_ENVIO_PADRAO,
): SalvarAniversarioConfigCommand {
  const percentualNormalizado = Number.isFinite(percentual) ? Math.min(Math.max(Math.trunc(percentual), 0), 100) : 0;
  const comCupom = percentualNormalizado > 0 && !!validadeDias && validadeDias >= 1;
  const horaNormalizada = horaEnvioAutomatico.trim();

  return {
    mensagem: mensagem && mensagem.trim().length > 0 ? mensagem.trim() : null,
    percentualDescontoPadrao: percentualNormalizado,
    validadeDiasPadrao: comCupom ? validadeDias : null,
    envioAutomatico,
    horaEnvioAutomatico: PADRAO_HORA_ENVIO.test(horaNormalizada) ? horaNormalizada : HORA_ENVIO_PADRAO,
    coletaDataNascimento,
  };
}

/** Meses do ano para o filtro da tabela (1..12 — contrato do backend). */
export const MESES_ANO: { valor: number; label: string }[] = [
  { valor: 1, label: 'Janeiro' },
  { valor: 2, label: 'Fevereiro' },
  { valor: 3, label: 'Março' },
  { valor: 4, label: 'Abril' },
  { valor: 5, label: 'Maio' },
  { valor: 6, label: 'Junho' },
  { valor: 7, label: 'Julho' },
  { valor: 8, label: 'Agosto' },
  { valor: 9, label: 'Setembro' },
  { valor: 10, label: 'Outubro' },
  { valor: 11, label: 'Novembro' },
  { valor: 12, label: 'Dezembro' },
];

/** Nome do mês (pt-BR) a partir da data ISO YYYY-MM-DD — coluna "Mês" da tabela. */


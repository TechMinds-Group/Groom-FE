import { SalvarAniversarioConfigCommand } from '../../services/aniversariantes.service';

/** Textos padrão do parabéns — espelho dos defaults do backend (RN-050/079/CR-004). */
export const MENSAGEM_PADRAO_COM_CUPOM =
  '🎉 Parabéns, {nome}! A equipe do {estabelecimento} deseja um feliz aniversário.\n\n' +
  'Presente nosso: {percentual}% de desconto nos serviços, válido por {validade} dias. Use o cupom {codigo} ao agendar.';

export const MENSAGEM_PADRAO_SEM_CUPOM =
  '🎉 Parabéns, {nome}! A equipe do {estabelecimento} deseja um feliz aniversário.';

/** Nome do estabelecimento exibido no preview quando ainda não carregado. */
export const ESTABELECIMENTO_PREVIEW_FALLBACK = 'nosso estabelecimento';

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
): string {
  const comCupom = percentual > 0 && !!validadeDias;
  const textoBase =
    mensagemConfig && mensagemConfig.trim().length > 0
      ? mensagemConfig
      : comCupom
        ? MENSAGEM_PADRAO_COM_CUPOM
        : MENSAGEM_PADRAO_SEM_CUPOM;

  return textoBase
    .replace('{nome}', 'Maria')
    .replace('{estabelecimento}', ESTABELECIMENTO_PREVIEW_FALLBACK)
    .replace('{percentual}', comCupom ? String(percentual) : '')
    .replace('{validade}', comCupom ? String(validadeDias) : '')
    .replace('{codigo}', comCupom ? 'ANIV-EXEMPLO1' : '');
}

/** Converte a config do formulário no comando de salvamento (desconto 0 zera a validade — RN-080). */
export function montarComandoSalvar(
  mensagem: string | null,
  percentual: number,
  validadeDias: number | null,
  envioAutomatico: boolean,
  coletaDataNascimento: boolean,
): SalvarAniversarioConfigCommand {
  const percentualNormalizado = Number.isFinite(percentual) ? Math.min(Math.max(Math.trunc(percentual), 0), 100) : 0;
  const comCupom = percentualNormalizado > 0 && !!validadeDias && validadeDias >= 1;

  return {
    mensagem: mensagem && mensagem.trim().length > 0 ? mensagem.trim() : null,
    percentualDescontoPadrao: percentualNormalizado,
    validadeDiasPadrao: comCupom ? validadeDias : null,
    envioAutomatico,
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

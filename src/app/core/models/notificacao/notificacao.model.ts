export type TipoNotificacao =
  | 'EstoqueBaixo'
  | 'ValidadeProxima'
  | 'AgendamentoCriado'
  | 'AgendamentoPendente'
  | 'AssinaturaVencendo'
  | 'ClienteNoShow'
  | 'Geral';

export interface NotificacaoItem {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoNotificacao;
  lida: boolean;
  linkRedirecionamento?: string;
  createdAtUtc: string;
}

export interface NotificacoesResposta {
  items: NotificacaoItem[];
  quantidadeNaoLidas: number;
}

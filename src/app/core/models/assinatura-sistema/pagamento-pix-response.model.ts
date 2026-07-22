/**
 * Interface de resposta retornado pelo gateway de pagamento para o QR Code Pix gerado.
 */
export interface PagamentoPixResponse {
  id: number;
  qrCode: string;
  qrCodeBase64: string;
  valorTotal: number;
}

/**
 * Modelo para persistência em sessão da resposta e expiração do QR Code Pix.
 */
export interface PixSessionCache {
  /** Identificador único do pagamento gerado no gateway */
  id: number;
  /** Código no formato 'copia e cola' para pagamento Pix */
  qrCode: string;
  /** Imagem do QR Code codificada em base64 */
  qrCodeBase64: string;
  /** Nome do plano contratado */
  nomePlano: string;
  /** Valor total cobrado */
  valorTotal: number;
  /** Timestamp de criação da sessão (ms) */
  createdAt: number;
  /** Timestamp de expiração após 15 minutos (ms) */
  expiresAt: number;
  /** ID do usuário autenticado que gerou o QR Code — invalida se o usuário mudar */
  userId: string;
}


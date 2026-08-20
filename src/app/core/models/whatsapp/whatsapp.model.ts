export interface WhatsAppInstanceStatus {
  instanceName: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  qrCode?: string;
}

export interface WhatsAppQrResponse {
  base64?: string;
  code?: string;
  status?: string;
  [key: string]: unknown;
}

export interface WhatsAppStatusResponse {
  instanceName: string;
  state: 'open' | 'close' | 'connecting';
  status: string;
  [key: string]: unknown;
}

export interface WhatsAppTenantConfig {
  welcomeMessage: string | null;
  closingMessage: string | null;
  lembrete1DiaMensagem: string | null;
  lembrete4hMensagem: string | null;
  testMode: boolean;
  testNumbers: string | null;
}

export interface ProfissionalWhatsAppConfig {
  id?: string;
  profissionalId: string;
  numero: string | null;
  profissionalNome?: string;
}

export interface MercadoPagoConfig {
  locale: string;
}

export interface PayerIdentification {
  type: string;
  number: string;
}

export interface PaymentBrickPayer {
  email?: string;
  firstName?: string;
  lastName?: string;
  identification?: PayerIdentification;
}

export interface PaymentBrickInitialization {
  amount: number;
  payer?: PaymentBrickPayer;
}

export interface PaymentBrickPaymentMethods {
  ticket?: string[];
  bankTransfer?: string[];
  maxInstallments?: number;
}

export interface PaymentBrickCustomization {
  paymentMethods: PaymentBrickPaymentMethods;
}

export interface PaymentBrickSubmitData {
  selectedPaymentMethod: string;
  formData: PaymentBrickFormData;
}

export interface PaymentBrickFormData {
  payment_method_id: string;
  transaction_amount: number;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: PayerIdentification;
  };
}

export interface PaymentBrickCallbacks {
  onReady: () => void;
  onSubmit: (submitData: PaymentBrickSubmitData) => Promise<void>;
  onError: (error: MercadoPagoError) => void;
}

export interface PaymentBrickSettings {
  initialization: PaymentBrickInitialization;
  customization: PaymentBrickCustomization;
  callbacks: PaymentBrickCallbacks;
}

export interface StatusScreenBrickInitialization {
  paymentId: string;
}

export interface StatusScreenBrickCallbacks {
  onReady: () => void;
  onError: (error: MercadoPagoError) => void;
}

export interface StatusScreenBrickSettings {
  initialization: StatusScreenBrickInitialization;
  callbacks: StatusScreenBrickCallbacks;
}

export interface MercadoPagoError {
  message: string;
  cause?: Array<{
    code: string;
    description: string;
  }>;
}

export interface BrickController {
  unmount: () => void;
}

export interface BricksBuilder {
  create: (
    brickName: 'payment' | 'statusScreen',
    containerId: string,
    settings: PaymentBrickSettings | StatusScreenBrickSettings
  ) => Promise<BrickController>;
}

export interface MercadoPagoInstance {
  bricks: () => BricksBuilder;
  getDeviceSessionId?: () => string;
  getDeviceProfile?: () => { session_id: string } | undefined;
}

export interface MercadoPagoStatic {
  new (publicKey: string, config?: MercadoPagoConfig): MercadoPagoInstance;
}

declare global {
  interface Window {
    MP_DEVICE_SESSION_ID?: string;
  }
}

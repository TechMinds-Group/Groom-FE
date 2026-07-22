import { inject, Injectable } from '@angular/core';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import { firstValueFrom } from 'rxjs';
import { AssinaturaSistemaService } from './assinatura-sistema.service';
import type { MercadoPagoInstance, MercadoPagoStatic } from '../types/mercado-pago.types';

@Injectable({
  providedIn: 'root',
})
export class MercadoPagoSdkService {
  private readonly assinaturaService = inject(AssinaturaSistemaService);

  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private mpInstance: MercadoPagoInstance | null = null;

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const config = await firstValueFrom(this.assinaturaService.getMercadoPagoConfig()).catch(() => null);
      const key = config?.publicKey?.trim();

      if (!key || key.startsWith('YOUR_') || key.startsWith('INJECT_') || key.includes('PLACEHOLDER')) {
        return;
      }

      const MercadoPago = (await loadMercadoPago()) as MercadoPagoStatic;
      this.mpInstance = new MercadoPago(key, { locale: 'pt-BR' });
      this.initialized = true;
    } catch {
      this.initPromise = null;
    }
  }

  public getDeviceSessionId(): string | undefined {
    const windowVal = (window as unknown as Record<string, string | undefined>)['MP_DEVICE_SESSION_ID'];
    if (windowVal) return windowVal;

    const inputEl = document.querySelector('input[name="MP_DEVICE_SESSION_ID"]') as HTMLInputElement | null;
    if (inputEl && inputEl.value) return inputEl.value;

    if (this.mpInstance && typeof (this.mpInstance as any).getDeviceProfile === 'function') {
      try {
        const profile = (this.mpInstance as any).getDeviceProfile();
        if (profile && profile.session_id) return profile.session_id;
      } catch {}
    }

    return undefined;
  }
}
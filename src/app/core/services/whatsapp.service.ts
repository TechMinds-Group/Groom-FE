import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WhatsAppTenantConfig } from '../models/whatsapp/whatsapp.model';

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/whatsapp`;

  async getConfig(): Promise<WhatsAppTenantConfig> {
    return firstValueFrom(
      this.http.get<WhatsAppTenantConfig>(`${this.apiUrl}/config`, { withCredentials: true }),
    );
  }

  async saveConfig(config: WhatsAppTenantConfig): Promise<WhatsAppTenantConfig> {
    return firstValueFrom(
      this.http.put<WhatsAppTenantConfig>(`${this.apiUrl}/config`, config, { withCredentials: true }),
    );
  }
}

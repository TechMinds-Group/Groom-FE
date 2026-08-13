import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfissionalWhatsAppConfig } from '../models/whatsapp/whatsapp.model';

interface ApiProfissionalWhatsAppResponse {
  id: string;
  nome: string;
  numero: string | null;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppProfissionalService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/whatsapp/profissionais`;

  getNumerosProfissionais(): Observable<ProfissionalWhatsAppConfig[]> {
    return this.http.get<ApiProfissionalWhatsAppResponse[]>(this.apiUrl, { withCredentials: true }).pipe(
      map((res) =>
        res.map((item) => ({
          id: item.id,
          profissionalId: item.id,
          profissionalNome: item.nome,
          numero: item.numero,
        })),
      ),
    );
  }

  salvarNumero(profissionalId: string, numero: string): Observable<ProfissionalWhatsAppConfig> {
    return this.http
      .put<ApiProfissionalWhatsAppResponse>(
        `${this.apiUrl}/${profissionalId}`,
        { numero },
        { withCredentials: true },
      )
      .pipe(
        map((item) => ({
          id: item.id,
          profissionalId: item.id,
          profissionalNome: item.nome,
          numero: item.numero,
        })),
      );
  }

  removerNumero(profissionalId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${profissionalId}`, { withCredentials: true });
  }
}

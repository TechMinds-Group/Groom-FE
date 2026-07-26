import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AssinantePublico {
  id: string;
  clienteNome: string;
  clienteEmail: string | null;
  clubeNome: string;
  valor: number;
  dataInicio: string;
  dataFim: string;
  status: string;
  diasRestantes: number;
  expiresAt: string;
}

export interface GerarLinkResponse {
  url: string;
  expiresAt: string;
  diasValidade: number;
}

@Injectable({
  providedIn: 'root',
})
export class CompartilharService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  acessarLink(token: string): Observable<AssinantePublico> {
    return this.http.get<AssinantePublico>(`${this.apiUrl}/compartilhar/${token}`);
  }

  gerarLink(assinanteId: string): Observable<GerarLinkResponse> {
    return this.http.post<GerarLinkResponse>(`${this.apiUrl}/assinantes-estabelecimento/${assinanteId}/gerar-link`, {});
  }
}

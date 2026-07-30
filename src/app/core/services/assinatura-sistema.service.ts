import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlanoAssinatura } from '../models/assinatura-sistema/plano-assinatura.model';
import { PagamentoPixResponse } from '../models/assinatura-sistema/pagamento-pix-response.model';
import { StatusPagamentoResponse } from '../models/assinatura-sistema/status-pagamento-response.model';

export type { PlanoAssinatura } from '../models/assinatura-sistema/plano-assinatura.model';
export type { PagamentoPixResponse } from '../models/assinatura-sistema/pagamento-pix-response.model';
export type { StatusPagamentoResponse } from '../models/assinatura-sistema/status-pagamento-response.model';

/**
 * Serviço responsável pela comunicação HTTP com todos os endpoints do módulo de Assinatura do Sistema e Checkout Pix.
 */
@Injectable({
  providedIn: 'root',
})
export class AssinaturaSistemaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/assinatura-sistema`;

  public getMercadoPagoConfig(): Observable<{ publicKey: string }> {
    return this.http.get<{ publicKey: string }>(`${this.apiUrl}/config`, {
      withCredentials: true,
    });
  }

  public getPlanoAtual(): Observable<PlanoAssinatura> {
    return this.http.get<PlanoAssinatura>(`${this.apiUrl}/atual`, { withCredentials: true });
  }

  public getPlanosDisponiveis(): Observable<PlanoAssinatura[]> {
    return this.http.get<PlanoAssinatura[]>(`${this.apiUrl}`, { withCredentials: true });
  }

  public getPlanoByNome(nome: string): Observable<PlanoAssinatura> {
    return this.http.get<PlanoAssinatura>(`${this.apiUrl}/${encodeURIComponent(nome)}`, { withCredentials: true });
  }

  public gerarPixAssinatura(
    meses: number,
    nomePlano?: string,
    email?: string,
    firstName?: string,
    lastName?: string,
    cpf?: string,
    deviceId?: string,
  ): Observable<PagamentoPixResponse> {
    return this.http.post<PagamentoPixResponse>(
      `${this.apiUrl}/pix`,
      { meses, nomePlano, email, firstName, lastName, cpf, deviceId },
      { withCredentials: true },
    );
  }

  public obterStatusPagamento(id: number): Observable<StatusPagamentoResponse> {
    return this.http.get<StatusPagamentoResponse>(
      `${this.apiUrl}/status/${id}`,
      { withCredentials: true },
    );
  }
}

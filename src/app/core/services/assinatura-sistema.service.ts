import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlanoAssinatura } from '../models/assinatura-sistema/plano-assinatura.model';

export type { PlanoAssinatura } from '../models/assinatura-sistema/plano-assinatura.model';

export interface CartaoCreditoRequest {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  postalCode: string;
  addressNumber: string;
}

export interface CheckoutAsaasRequest {
  planoId: string;
  formaPagamento: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  diaVencimento: number;
  email?: string;
  cnpj?: string;
  telefone?: string;
  cartao?: CartaoCreditoRequest;
}

export interface CheckoutAsaasResponse {
  subscriptionId: string;
  paymentId: string;
  formaPagamento: string;
  valorPlano: number;
  taxaGateway: number;
  valorTotal: number;
  pixCopiaECola?: string;
  pixQrCodeBase64?: string;
  linhaDigitavelBoleto?: string;
  boletoPdfUrl?: string;
  status: string;
}

/**
 * Serviço responsável pela comunicação HTTP com todos os endpoints do módulo de Assinatura do Sistema Asaas.
 */
@Injectable({
  providedIn: 'root',
})
export class AssinaturaSistemaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/assinatura-sistema`;

  public checkoutAsaas(request: CheckoutAsaasRequest): Observable<CheckoutAsaasResponse> {
    return this.http.post<CheckoutAsaasResponse>(`${this.apiUrl}/checkout-asaas`, request, {
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

  public sincronizarPagamento(): Observable<{ sincronizado: boolean }> {
    return this.http.post<{ sincronizado: boolean }>(`${this.apiUrl}/sincronizar`, {}, { withCredentials: true });
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TemaGravacao,
  TemaLeitura,
  TemaOrigem,
  TemaSugestao,
} from '../models/tema/tema.model';

/** Suprime o toast global do errorInterceptor — o editor exibe o erro `Tema.*` com destaque de campo. */
const SKIP_ERROR_TOAST = { headers: { 'X-Skip-Error-Toast': 'true' } };

/**
 * Serviço de API do Tema Visual (RN-098..105 — API_CONTRACTS §19).
 * Escritas restritas a Administrador no backend; leituras livres.
 */
@Injectable({
  providedIn: 'root',
})
export class TemaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/tema`;
  private readonly publicApiUrl = `${environment.apiUrl}/api/publico`;

  /** Payload comum do tema do tenant corrente (§19.1); sem tema → configurado: false (RN-100). */
  async obterTema(): Promise<TemaLeitura> {
    return firstValueFrom(this.http.get<TemaLeitura>(this.apiUrl, SKIP_ERROR_TOAST));
  }

  /** Payload comum do tema por slug do estabelecimento (§19.1 — portal anônimo, RN-098-3). */
  async obterTemaPublico(estabelecimento: string): Promise<TemaLeitura> {
    return firstValueFrom(
      this.http.get<TemaLeitura>(`${this.publicApiUrl}/${estabelecimento}/tema`, SKIP_ERROR_TOAST),
    );
  }

  /** Gravação (upsert — 1 tema por tenant, RN-105); retorno = payload comum salvo (§19.2). */
  async salvarTema(payload: TemaGravacao): Promise<TemaLeitura> {
    return firstValueFrom(this.http.put<TemaLeitura>(this.apiUrl, payload, SKIP_ERROR_TOAST));
  }

  /** Restaurar padrão = excluir a linha (RN-103); 204 idempotente. */
  async restaurarPadrao(): Promise<void> {
    await firstValueFrom(this.http.delete<void>(this.apiUrl, SKIP_ERROR_TOAST));
  }

  /** Sugestão da paleta do modo oposto (RN-102) — não persiste; 404 Tema.NaoConfigurado sem tema. */
  async gerarModoOposto(origem: TemaOrigem): Promise<TemaSugestao> {
    return firstValueFrom(
      this.http.post<TemaSugestao>(`${this.apiUrl}/gerar-modo-oposto`, { origem }, SKIP_ERROR_TOAST),
    );
  }
}

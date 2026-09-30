import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgendamentoPublicoService } from './agendamento-publico.service';
import { EntrarListaEsperaPayload, ListaEsperaItem, ListaEsperaReserva } from '../models/lista-espera/lista-espera.model';

/**
 * Endpoints da lista de espera no portal do cliente (RN-074 — API_CONTRACTS §15.1).
 * Tenant resolvido pelo slug do path (sem X-Tenant-Id); autenticação via cookie ClienteJwt (RN-028).
 */
@Injectable({
  providedIn: 'root',
})
export class ListaEsperaService {
  private readonly http = inject(HttpClient);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);

  private get baseUrl(): string {
    const estabelecimento = this.agendamentoPublicoService.estabelecimento() ?? '';
    return `${environment.apiUrl}/api/publico/${estabelecimento}/lista-espera`;
  }

  /** Entra na lista do dia com preferências opcionais. 409 `ListaEspera.Duplicada` quando já há entrada ativa. */
  async entrar(preferencias: EntrarListaEsperaPayload): Promise<ListaEsperaItem> {
    return firstValueFrom(
      this.http.post<ListaEsperaItem>(this.baseUrl, preferencias, { withCredentials: true }),
    );
  }

  /** Entrada ativa do cliente no dia (posição FIFO) ou null quando não está na lista. */
  async meuStatus(): Promise<ListaEsperaItem | null> {
    return firstValueFrom(
      this.http.get<ListaEsperaItem | null>(`${this.baseUrl}/meu-status`, { withCredentials: true }),
    );
  }

  /** Sai da lista: apenas a própria entrada ativa (Status → "Removida"). */
  async sair(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true }),
    );
  }

  /**
   * Detalhes do slot reservado — destino do deep link do WhatsApp (RN-075/076).
   * Erros tratados pelo chamador: 403 (reserva de outro cliente), 410
   * `ListaEspera.ReservaExpirada`, 404 (não encontrada).
   */
  async obterReserva(reservaId: string): Promise<ListaEsperaReserva> {
    const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
    return firstValueFrom(
      this.http.get<ListaEsperaReserva>(`${this.baseUrl}/reserva/${reservaId}`, {
        withCredentials: true,
        headers,
      }),
    );
  }

  // ── Painel do estabelecimento (RN-077 — API_CONTRACTS §15.2) ──────────────
  // Tenant via X-Tenant-Id do tenantInterceptor; autenticação por cookie staff.

  /** Lista do dia em ordem FIFO com preferências, posição e reserva ativa (`data` = "YYYY-MM-DD"). */
  async listarDoDia(data: string): Promise<ListaEsperaItem[]> {
    return firstValueFrom(
      this.http.get<ListaEsperaItem[]>(`${environment.apiUrl}/api/lista-espera`, {
        params: { data },
      }),
    );
  }

  /**
   * Remove cliente da lista pela recepção/admin (Status → "Removida").
   * 403 `Agendamento.Forbidden` quando o perfil não tem permissão (RN-015); 404 quando inexistente.
   */
  async remover(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${environment.apiUrl}/api/lista-espera/${id}`));
  }
}

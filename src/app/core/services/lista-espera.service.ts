import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgendamentoPublicoService } from './agendamento-publico.service';
import {
  AdicionarListaEsperaPayload,
  EntrarListaEsperaPayload,
  ListaEsperaCriada,
  ListaEsperaItem,
  ListaEsperaReserva,
} from '../models/lista-espera/lista-espera.model';

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

  /**
   * RN-074 — entrada ativa do cliente no dia compartilhada entre todos os widgets
   * do portal (topo do wizard e passo data/horário). Mantém ambos sincronizados
   * após entrar/sair: o botão "Lista de espera" nunca abre o formulário de
   * entrada quando o cliente já está na fila — apenas o modal informativo.
   */
  readonly statusAtual = signal<ListaEsperaItem | null>(null);

  /** Entra na lista do dia com preferências opcionais. 409 `ListaEspera.Duplicada` quando já há entrada ativa. */
  async entrar(preferencias: EntrarListaEsperaPayload): Promise<ListaEsperaItem> {
    const criada = await firstValueFrom(
      this.http.post<ListaEsperaItem>(this.baseUrl, preferencias, { withCredentials: true }),
    );
    this.statusAtual.set(criada);
    return criada;
  }

  /** Entrada ativa do cliente no dia (posição FIFO) ou null quando não está na lista. */
  async meuStatus(): Promise<ListaEsperaItem | null> {
    const status = await firstValueFrom(
      this.http.get<ListaEsperaItem | null>(`${this.baseUrl}/meu-status`, { withCredentials: true }),
    );
    this.statusAtual.set(status);
    return status;
  }

  /** Sai da lista: apenas a própria entrada ativa (Status → "Removida"). */
  async sair(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true }),
    );
    this.statusAtual.set(null);
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

  /**
   * RN-074/075 — recusa da oferta pelo portal: Status → "Cancelada" e repasse
   * FIFO imediato para o próximo da fila. Erros tratados pelo chamador: 403
   * (reserva de outro cliente), 410 (expirada/já processada), 404 (não encontrada).
   */
  async recusarReserva(reservaId: string): Promise<void> {
    const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/reserva/${reservaId}/recusar`, {}, {
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
   * Adiciona cliente à lista do dia pela recepção (regra 1 do RN-074 — [Authorize] staff).
   * 409 `ListaEspera.Duplicada` quando o cliente já tem entrada ativa no dia;
   * 404 cliente/serviço/profissional inexistente.
   */
  async adicionarEntrada(payload: AdicionarListaEsperaPayload): Promise<ListaEsperaCriada> {
    return firstValueFrom(
      this.http.post<ListaEsperaCriada>(`${environment.apiUrl}/api/lista-espera`, payload),
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

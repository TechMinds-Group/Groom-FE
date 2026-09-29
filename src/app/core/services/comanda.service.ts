import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdicionarProdutoRequest,
  AdicionarServicoRequest,
  Comanda,
  ComandaItem,
  ComandaStatus,
  CriarComandaAvulsaRequest,
  FecharComandaRequest,
  FiltrosHistoricoComanda,
  MensagemApi,
} from '../models/comanda/comanda.model';

@Injectable({ providedIn: 'root' })
export class ComandaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/comandas`;

  getComandas(status?: ComandaStatus): Observable<Comanda[]> {
    const params: Record<string, string> = {};
    if (status) {
      params['status'] = status;
    }
    return this.http.get<Comanda[]>(this.apiUrl, { withCredentials: true, params });
  }

  getComanda(id: string): Observable<Comanda> {
    return this.http.get<Comanda>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  criarAvulsa(data: CriarComandaAvulsaRequest): Observable<Comanda> {
    return this.http.post<Comanda>(`${this.apiUrl}/avulsa`, data, { withCredentials: true });
  }

  adicionarProduto(comandaId: string, data: AdicionarProdutoRequest): Observable<ComandaItem> {
    return this.http.post<ComandaItem>(`${this.apiUrl}/${comandaId}/produtos`, data, {
      withCredentials: true,
    });
  }

  adicionarServico(comandaId: string, data: AdicionarServicoRequest): Observable<ComandaItem> {
    return this.http.post<ComandaItem>(`${this.apiUrl}/${comandaId}/servicos`, data, {
      withCredentials: true,
    });
  }

  /** Retorna `{ message }` (200) — o backend não devolve 204 na remoção de item. */
  removerItem(comandaId: string, itemId: string): Observable<MensagemApi> {
    return this.http.delete<MensagemApi>(`${this.apiUrl}/${comandaId}/itens/${itemId}`, {
      withCredentials: true,
    });
  }

  /** Requer perfil de Administrador — não admin recebe 403 do backend. */
  reabrir(comandaId: string): Observable<Comanda> {
    return this.http.put<Comanda>(`${this.apiUrl}/${comandaId}/reabrir`, {}, { withCredentials: true });
  }

  fechar(comandaId: string, data: FecharComandaRequest): Observable<Comanda> {
    return this.http.put<Comanda>(`${this.apiUrl}/${comandaId}/fechar`, data, { withCredentials: true });
  }

  cancelar(comandaId: string): Observable<Comanda> {
    return this.http.put<Comanda>(`${this.apiUrl}/${comandaId}/cancelar`, {}, { withCredentials: true });
  }

  /** Retorna apenas comandas Fechada/Cancelada, ordenadas por data de fechamento desc. */
  getHistorico(filtros: FiltrosHistoricoComanda): Observable<Comanda[]> {
    const params: Record<string, string> = {};
    if (filtros.clienteId) {
      params['clienteId'] = filtros.clienteId;
    }
    if (filtros.dataInicio) {
      params['dataInicio'] = filtros.dataInicio;
    }
    if (filtros.dataFim) {
      params['dataFim'] = filtros.dataFim;
    }
    if (filtros.profissionalId) {
      params['profissionalId'] = filtros.profissionalId;
    }
    return this.http.get<Comanda[]>(`${this.apiUrl}/historico`, { withCredentials: true, params });
  }
}

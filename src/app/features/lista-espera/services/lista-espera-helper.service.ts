import { Injectable } from '@angular/core';
import { STATUS_LISTA_ESPERA, StatusListaEsperaBadge } from '../models/lista-espera-status.model';

/**
 * Helper de formatação do painel da lista de espera — injetado no componente
 * e no pipe de badge (sem `providedIn: 'root'` — uso exclusivo da feature).
 */
@Injectable()
export class ListaEsperaHelperService {
  statusParaBadge(status: string): StatusListaEsperaBadge | null {
    return STATUS_LISTA_ESPERA[status] ?? null;
  }

  /**
   * Contagem regressiva "MM:SS" da janela da reserva ativa — `expiraEmUtc` é um
   * instante real em UTC; a diferença contra o relógio do cliente não sofre
   * deslocamento de fuso (DEC-002 afeta apenas datas "sem hora").
   */
  contagemReserva(expiraEmUtc: string, agoraMs: number): string {
    const restante = Math.max(0, Math.floor((Date.parse(expiraEmUtc) - agoraMs) / 1000));
    const minutos = Math.floor(restante / 60);
    const segundos = restante % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }

  /** Hora local de "entrada às" a partir do instante UTC de criação (pt-BR, HH:mm). */
  horaDe(criadaEmUtc: string): string {
    const data = new Date(criadaEmUtc);
    if (Number.isNaN(data.getTime())) {
      return '—';
    }
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}

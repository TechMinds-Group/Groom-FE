import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AgendamentoPublicoService } from '../../../core/services/agendamento-publico.service';

/**
 * Mantém viva a sessão do cliente no portal público (RN-028): o cookie ClienteAuth
 * dura 30s e o JWT 1 min — sem este polling, toda ação após ~30s do login falha
 * com 401 (o cookie expira e nada o renova). A cada 20s chama o keep-alive do
 * backend: com o JWT ainda válido ele re-emite o cookie (sliding) e, com o
 * ClienteRefresh ("Manter conectado"), restaura a sessão automaticamente.
 */
@Injectable({ providedIn: 'root' })
export class ClienteSessionKeepAliveService {
  private intervalId?: ReturnType<typeof setInterval>;
  private readonly http = inject(HttpClient);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);

  /**
   * Inicia o polling de 20s se houver cliente logado (verifica via GET /me —
   * cobre também o retorno após refresh de página, quando o signal ainda está vazio).
   */
  async start(): Promise<void> {
    if (this.intervalId) {
      return;
    }

    const estabelecimento = this.agendamentoPublicoService.estabelecimento();
    if (!estabelecimento) {
      return;
    }

    // Sem sessão ativa não há nada para manter vivo (o próprio getMe popula o signal)
    const cliente = await this.agendamentoPublicoService.getMe().catch(() => null);
    if (!cliente || this.intervalId) {
      return;
    }

    const url = `${environment.apiUrl}/api/publico/${estabelecimento}/agendamento/refresh-session`;
    this.intervalId = setInterval(() => {
      this.http
        .post(url, {}, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } })
        .subscribe({
          error: () => {
            this.stop();
          },
        });
    }, 20_000);
  }

  /** Encerra o polling (logout do cliente). */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

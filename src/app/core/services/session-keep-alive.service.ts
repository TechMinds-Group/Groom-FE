import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Mantém a sessão viva chamando o endpoint de refresh-session a cada 20s.
 * Se falhar (401), para automaticamente — o error interceptor redireciona ao login.
 */
@Injectable({ providedIn: 'root' })
export class SessionKeepAliveService {
  private intervalId?: ReturnType<typeof setInterval>;
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/account`;

  /** Inicia o polling de 20s para manter a sessão viva */
  start(): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.http.post(`${this.apiUrl}/refresh-session`, {}, {
        withCredentials: true,
        headers: { 'X-Skip-Error-Toast': 'true' }
      }).subscribe({
        error: () => {
          this.stop();
        }
      });
    }, 20_000);
  }

  /** Para o polling */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
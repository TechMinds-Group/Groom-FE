import { Injectable, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Mantém a conexão SignalR com o hub de agenda do backend e expõe a versão
 * do último evento de alteração de agendamentos. O backend só publica o evento
 * para o grupo do tenant do usuário autenticado (cookie).
 */
@Injectable({
  providedIn: 'root'
})
export class AgendaHubService {
  private readonly authService = inject(AuthService);

  /** Versão do último evento AgendamentosAlterados recebido (0 = nenhum evento ainda). */
  public readonly eventVersion = signal(0);

  private connection: HubConnection | null = null;

  /** Conecta ao hub reutilizando a conexão já ativa, se houver. */
  public async connect(): Promise<void> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      return;
    }

    if (this.connection && this.connection.state !== HubConnectionState.Disconnected) {
      return;
    }

    this.connection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/agenda`, { withCredentials: true })
      // Reconexão infinita: o padrão do SignalR desiste após ~42s, deixando a agenda
      // sem atualizações até o usuário recarregar a página (ex.: reinício do backend).
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: () => 30_000 })
      .build();

    this.connection.on('AgendamentosAlterados', () => {
      this.eventVersion.update((v) => v + 1);
    });

    try {
      await this.connection.start();
    } catch {
      this.connection = null;
    }
  }

  /** Encerra a conexão com o hub. */
  public async disconnect(): Promise<void> {
    if (!this.connection || this.connection.state === HubConnectionState.Disconnected) {
      this.connection = null;
      return;
    }

    try {
      await this.connection.stop();
    } finally {
      this.connection = null;
    }
  }
}
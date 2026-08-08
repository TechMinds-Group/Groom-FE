import { Injectable, signal } from '@angular/core';
import { ClienteAgendamento } from '../../../core/models/agendamento-publico/agendamento-publico.model';

/** Gerencia a sessão do cliente de agendamento (token + dados), compartilhada entre login e wizard. */
@Injectable({
  providedIn: 'root',
})
export class AuthClienteHelperService {
  private readonly _cliente = signal<ClienteAgendamento | null>(null);
  readonly cliente = this._cliente.asReadonly();

  iniciarSessao(cliente: ClienteAgendamento, token: string): void {
    this._cliente.set(cliente);
    sessionStorage.setItem('groom_cliente', JSON.stringify(cliente));
    sessionStorage.setItem('groom_cliente_token', token);
  }

  restaurarSessao(): void {
    const raw = sessionStorage.getItem('groom_cliente');
    if (raw) {
      try {
        this._cliente.set(JSON.parse(raw) as ClienteAgendamento);
      } catch {
        this._cliente.set(null);
      }
    }
  }

  encerrarSessao(): void {
    this._cliente.set(null);
    sessionStorage.removeItem('groom_cliente');
    sessionStorage.removeItem('groom_cliente_token');
  }

  getToken(): string | null {
    return sessionStorage.getItem('groom_cliente_token');
  }
}

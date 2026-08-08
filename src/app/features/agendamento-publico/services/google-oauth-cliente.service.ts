import { Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
  renderButton: (parent: Element, options: { theme: string; size: string; width: number; text: string; shape: string }) => void;
}

/** Carrega o Google Identity Services e disponibiliza o idToken do cliente Google (login social). */
@Injectable({
  providedIn: 'root',
})
export class GoogleOAuthClienteService {
  private readonly _disponivel = signal(false);
  readonly disponivel = this._disponivel.asReadonly();

  /** Inicializa o GIS com o clientId do environment; sem clientId, o login Google fica indisponível. */
  inicializar(container: Element, onToken: (idToken: string) => void): void {
    const clientId = environment.googleClientId;
    if (!clientId) {
      return;
    }

    const google = (window as unknown as { google?: { accounts?: GoogleAccountsId } }).google;
    if (google?.accounts) {
      this.renderButton(clientId, container, onToken);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.renderButton(clientId, container, onToken);
    document.head.appendChild(script);
  }

  private renderButton(clientId: string, container: Element, onToken: (idToken: string) => void): void {
    const google = (window as unknown as { google: { accounts: GoogleAccountsId } }).google;
    google.accounts.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => onToken(response.credential),
    });
    google.accounts.renderButton(container, {
      theme: 'outline',
      size: 'large',
      width: 300,
      text: 'continue_with',
      shape: 'rectangular',
    });
    this._disponivel.set(true);
  }
}

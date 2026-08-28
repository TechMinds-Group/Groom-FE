import { Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
    itp_support?: boolean;
    auto_select?: boolean;
  }) => void;
  renderButton: (parent: Element, options: { theme: string; size: string; width: number; text: string; shape: string }) => void;
}

/** Namespace exposto pelo script GIS: google.accounts.id. */
type GoogleAccountsApi = {
  accounts?: {
    id?: GoogleAccountsId;
  };
};

const SCRIPT_ID = 'groom-gsi-client';

/** Carrega o Google Identity Services e disponibiliza o idToken do cliente Google (login social). */
@Injectable({
  providedIn: 'root',
})
export class GoogleOAuthClienteService {
  private readonly _disponivel = signal(false);
  readonly disponivel = this._disponivel.asReadonly();

  /** Inicializa o GIS com o clientId do environment; sem clientId, o login Google fica indisponível. */
  inicializar(container: Element, onToken: (idToken: string) => void, theme: 'outline' | 'filled_black' = 'outline'): void {
    const clientId = environment.googleClientId;
    if (!clientId) {
      return;
    }

    if (this.apiDisponivel()) {
      this.renderButton(clientId, container, onToken, theme);
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      this.aguardarApi(() => this.renderButton(clientId, container, onToken, theme));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.aguardarApi(() => this.renderButton(clientId, container, onToken, theme));
    document.head.appendChild(script);
  }

  private apiDisponivel(): boolean {
    return typeof this.getGoogle().accounts?.id?.initialize === 'function';
  }

  private getGoogle(): GoogleAccountsApi {
    return (window as unknown as { google?: GoogleAccountsApi }).google ?? {};
  }

  /** O script GIS pode carregar antes de expor `google.accounts.id`; aguarda até 5s com retry. */
  private aguardarApi(callback: () => void): void {
    const tentativas = 25;
    let contador = 0;

    const verificar = (): void => {
      if (this.apiDisponivel()) {
        callback();
        return;
      }
      contador += 1;
      if (contador < tentativas) {
        setTimeout(verificar, 200);
      }
    };

    verificar();
  }

  private renderButton(clientId: string, container: Element, onToken: (idToken: string) => void, theme: 'outline' | 'filled_black' = 'outline'): void {
    const id = this.getGoogle().accounts?.id;
    if (!id) {
      return;
    }
    container.innerHTML = '';
    id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => onToken(response.credential),
      ux_mode: 'popup',
      context: 'signin',
      itp_support: true,
      auto_select: false,
    });
    id.renderButton(container, {
      theme: theme,
      size: 'large',
      width: 300,
      text: 'continue_with',
      shape: 'rectangular',
    });
    this._disponivel.set(true);
  }
}

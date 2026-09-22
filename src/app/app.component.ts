import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TmToastComponent } from '@techminds-group/tm-angular-lib';
import { AuthService } from './core/services/auth.service';
import { SessionKeepAliveService } from './core/services/session-keep-alive.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TmToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly sessionKeepAlive = inject(SessionKeepAliveService);
  protected readonly title = signal('Groom-FE');

  ngOnInit(): void {
    // Verificar sessão no startup: se ativa, inicia keep-alive
    this.authService.checkAuth().subscribe({
      next: () => {
        this.sessionKeepAlive.start();
      },
      error: () => {
        // Sessão expirada — verificar se há refresh cookie para restaurar
        this.authService.getMe().subscribe({
          next: () => {
            this.sessionKeepAlive.start();
          },
          error: () => {
            // Ambos falharam — redirecionamento é feito pelo guard de rota
          }
        });
      }
    });
  }
}

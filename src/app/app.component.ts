import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TmToastComponent } from '@techminds-group/tm-angular-lib';
import { AuthService } from './core/services/auth.service';

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
  protected readonly title = signal('Groom-FE');

  ngOnInit(): void {
    // A sessão é mantida pelo backend (TMAPI + TMCON com restauração transparente).
    // Aqui só hidratamos o contexto do usuário para UI/tema quando já há sessão.
    this.authService.getMe().subscribe({
      error: () => {
        // Sem sessão — o guard de rota cuida do redirecionamento
      }
    });
  }
}
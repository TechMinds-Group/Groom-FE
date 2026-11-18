import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TmToastComponent } from '@techminds-group/tm-angular-lib';
import { AuthService } from './core/services/auth.service';
import { TemaVisualService } from './core/services/tema-visual.service';

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
  private readonly temaVisual = inject(TemaVisualService);
  protected readonly title = signal('Groom-FE');

  ngOnInit(): void {
    // A sessão é mantida pelo backend (TMAPI + TMCON com restauração transparente).
    // Aqui só hidratamos o contexto do usuário para UI/tema quando já há sessão.
    this.authService.getMe().subscribe({
      next: () => {
        // RN-098: aplica o tema do tenant no boot do painel (fallback RN-100 em falha).
        void this.temaVisual.carregarAplicar();
      },
      error: () => {
        // Sem sessão — o guard de rota cuida do redirecionamento
      }
    });
  }
}

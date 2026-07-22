import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TmToastComponent } from '@techminds-group/tm-angular-lib';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TmToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly title = signal('Groom-FE');
}

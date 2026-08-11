import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { Agendamento } from '../../../../../core/models/agenda.model';

@Component({
  selector: 'app-disponibilidade-conflitos',
  standalone: true,
  imports: [CommonModule, TmModalComponent, TranslatePipe],
  templateUrl: './disponibilidade-conflitos.component.html',
  styleUrl: './disponibilidade-conflitos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisponibilidadeConflitosComponent {
  readonly show = model<boolean>(false);
  readonly conflitos = input<Agendamento[]>([]);
  readonly fechar = output<void>();

  /** Fecha o modal e notifica o pai — modal é apenas informativo (D-06: o save já foi persistido). */
  protected fecharModal(): void {
    this.show.set(false);
    this.fechar.emit();
  }
}

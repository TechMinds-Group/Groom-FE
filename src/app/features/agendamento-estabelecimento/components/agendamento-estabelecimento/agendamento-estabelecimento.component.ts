import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-agendamento-estabelecimento',
  standalone: true,
  templateUrl: './agendamento-estabelecimento.component.html',
  styleUrl: './agendamento-estabelecimento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendamentoEstabelecimentoComponent {
  private readonly authService = inject(AuthService);

  readonly copiado = signal(false);

  get linkAgendamento(): string {
    const estabelecimento = this.authService.currentUser()?.estabelecimento ?? '';
    return `${window.location.origin}/agendamento/${estabelecimento}/login`;
  }

  get linkWhatsApp(): string {
    const texto = `Agende seu horário: ${this.linkAgendamento}`;
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  async copiarLink(): Promise<void> {
    await navigator.clipboard.writeText(this.linkAgendamento);
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  abrirPreview(): void {
    window.open(this.linkAgendamento, '_blank');
  }
}

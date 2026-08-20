import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';

@Component({
  selector: 'app-agendamento-estabelecimento',
  standalone: true,
  templateUrl: './agendamento-estabelecimento.component.html',
  styleUrl: './agendamento-estabelecimento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendamentoEstabelecimentoComponent {
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly router = inject(Router);

  readonly copiado = signal(false);
  readonly linkAgendamento = signal('');

  constructor() {
    void this.carregarLink();
  }

  /** Busca o link persistido no backend; gerado e salvo no primeiro acesso. */
  private async carregarLink(): Promise<void> {
    try {
      this.linkAgendamento.set(await this.estabelecimentoService.obterLinkAgendamento());
    } catch {
      this.linkAgendamento.set('');
    }
  }

  get linkWhatsApp(): string {
    const texto = `Agende seu horário: ${this.linkAgendamento()}`;
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  async copiarLink(): Promise<void> {
    await navigator.clipboard.writeText(this.linkAgendamento());
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  abrirPreview(): void {
    window.open(this.linkAgendamento(), '_blank');
  }

  voltar(): void {
    void this.router.navigate(['/dashboard']);
  }
}
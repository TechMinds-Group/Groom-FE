import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TmButtonComponent } from '@techminds-group/tm-angular-lib';
import { ProfissionalDisponivel, ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';

@Component({
  selector: 'app-passo-resumo',
  standalone: true,
  imports: [TmButtonComponent],
  templateUrl: './passo-resumo.component.html',
  styleUrl: './passo-resumo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassoResumoComponent {
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
  readonly profissional = input.required<ProfissionalDisponivel | null>();
  readonly servico = input.required<ServicoDisponivel | null>();
  readonly data = input<string | null>(null);
  readonly horario = input<string | null>(null);
  readonly isLoading = input(false);
  /** Nome do plano quando o agendamento é via assinatura (incluso no plano). */
  readonly planoNome = input<string | null>(null);
  /** Duração em minutos quando o agendamento é via plano. */
  readonly duracao = input<number | null>(null);

  readonly confirmar = output<void>();
  readonly expandirImagem = output<{ url?: string; urls?: string[]; titulo: string }>();

  onImagemClick(event: Event, url: string, nome: string): void {
    event.stopPropagation();
    this.expandirImagem.emit({ url, titulo: nome });
  }

  onServicoImagemClick(event: Event): void {
    event.stopPropagation();
    const s = this.servico();
    if (!s) return;
    const raw = [s.imagemUrl, s.imagemUrl2, s.imagemUrl3].filter(Boolean) as string[];
    const urls = raw.map(img => this.estabelecimentoService.resolverUrl(img));
    if (urls.length === 0) return;
    this.expandirImagem.emit({ urls, url: urls[0], titulo: s.nome });
  }

  formatarData(data: string): string {
    const [ano, mes, dia] = data.split('-').map(Number);
    return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
  }

  formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  inicial(nome: string): string {
    return nome ? nome.charAt(0).toUpperCase() : '?';
  }
}


import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';

@Component({
  selector: 'app-passo-servico',
  standalone: true,
  templateUrl: './passo-servico.component.html',
  styleUrl: './passo-servico.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassoServicoComponent implements OnInit, OnDestroy {
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
  readonly servicos = input.required<ServicoDisponivel[]>();
  readonly selecionado = output<ServicoDisponivel>();
  readonly expandirImagem = output<{ url?: string; urls?: string[]; titulo: string }>();

  /** Guarda o índice da imagem ativa atual para cada serviço (muda a cada 3 segundos) */
  protected readonly activeIndices = signal<Record<string, number>>({});
  private timer: any = null;

  ngOnInit(): void {
    this.timer = setInterval(() => {
      const lista = this.servicos();
      if (!lista || lista.length === 0) return;

      this.activeIndices.update(current => {
        const nextMap = { ...current };
        for (const s of lista) {
          const imgs = this.obterImagensValidas(s);
          if (imgs.length > 1) {
            const curIdx = nextMap[s.id] || 0;
            nextMap[s.id] = (curIdx + 1) % imgs.length;
          }
        }
        return nextMap;
      });
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  obterImagensValidas(s: ServicoDisponivel): string[] {
    const raw = [s.imagemUrl, s.imagemUrl2, s.imagemUrl3].filter(Boolean) as string[];
    return raw.map(img => this.estabelecimentoService.resolverUrl(img));
  }

  obterImagemExibicao(s: ServicoDisponivel): string | null {
    const imgs = this.obterImagensValidas(s);
    if (imgs.length === 0) return null;
    const idx = this.activeIndices()[s.id] || 0;
    return imgs[idx % imgs.length];
  }

  formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  onImagemClick(event: Event, servico: ServicoDisponivel): void {
    event.stopPropagation();
    const urls = this.obterImagensValidas(servico);
    if (urls.length === 0) return;
    this.expandirImagem.emit({ urls, url: urls[0], titulo: servico.nome });
  }
}

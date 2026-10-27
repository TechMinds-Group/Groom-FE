import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TmButtonComponent, TmModalComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublicoService, MeuAgendamentoItem } from '../../../../core/services/agendamento-publico.service';

/** Status → badge do card de agendamento (const RECORD — CR-004). */
const STATUS_BADGE: Record<string, { classe: string; rotulo: string }> = {
  confirmado: { classe: 'text-bg-success', rotulo: 'Confirmado' },
  agendado: { classe: 'text-bg-warning', rotulo: 'Aguardando confirmação' },
  cancelado: { classe: 'text-bg-danger', rotulo: 'Cancelado' },
  recusado: { classe: 'text-bg-danger', rotulo: 'Recusado' },
  concluido: { classe: 'text-bg-secondary', rotulo: 'Concluído' },
  nao_compareceu: { classe: 'text-bg-dark', rotulo: 'Não compareceu' },
};

/**
 * "Meus agendamentos" do portal (CR-004): abas Ativos (remarcar/cancelar) e
 * Histórico (completo, paginado) da conta logada no link de agendamento.
 */
@Component({
  selector: 'app-meus-agendamentos',
  standalone: true,
  imports: [CommonModule, FormsModule, TmButtonComponent, TmModalComponent],
  templateUrl: './meus-agendamentos.component.html',
  styleUrl: './meus-agendamentos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeusAgendamentosComponent implements OnInit {
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly toastService = inject(TmToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Remarca: o pai reabre o wizard no seletor de data/horário com o alvo fixado. */
  readonly remarcar = output<MeuAgendamentoItem>();
  readonly voltar = output<void>();

  protected readonly abaAtiva = signal<'ativos' | 'historico'>('ativos');
  protected readonly itens = signal<MeuAgendamentoItem[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly carregando = signal(true);
  protected readonly carregandoMais = signal(false);
  protected readonly cancelando = signal(false);
  protected readonly itemCancelar = signal<MeuAgendamentoItem | null>(null);

  /** Habilita "Carregar mais" quando a página atual não esgotou o total. */
  protected readonly haMaisPaginas = computed<boolean>(() =>
    this.pagina() * 10 < this.total(),
  );

  ngOnInit(): void {
    void this.carregar();
  }

  protected async carregar(): Promise<void> {
    this.carregando.set(true);

    try {
      const resposta = await this.agendamentoPublicoService.listarMeusAgendamentos(this.abaAtiva());
      this.itens.set(resposta.itens);
      this.total.set(resposta.total);
      this.pagina.set(1);
    } catch {
      this.toastService.error('Não foi possível carregar seus agendamentos.');
    } finally {
      this.carregando.set(false);
      this.cdr.markForCheck();
    }
  }

  protected async trocarAba(aba: 'ativos' | 'historico'): Promise<void> {
    if (aba === this.abaAtiva()) {
      return;
    }

    this.abaAtiva.set(aba);
    await this.carregar();
  }

  protected async carregarMais(): Promise<void> {
    if (this.carregandoMais() || this.haMaisPaginas() === false) {
      return;
    }

    this.carregandoMais.set(true);

    try {
      const proxima = this.pagina() + 1;
      const resposta = await this.agendamentoPublicoService.listarMeusAgendamentos('historico', proxima);
      this.itens.update((atual) => [...atual, ...resposta.itens]);
      this.total.set(resposta.total);
      this.pagina.set(proxima);
    } catch {
      this.toastService.error('Não foi possível carregar mais agendamentos.');
    } finally {
      this.carregandoMais.set(false);
      this.cdr.markForCheck();
    }
  }

  protected abrirCancelar(item: MeuAgendamentoItem): void {
    this.itemCancelar.set(item);
  }

  protected fecharCancelar(): void {
    this.itemCancelar.set(null);
  }

  protected async confirmarCancelamento(): Promise<void> {
    const item = this.itemCancelar();
    if (!item || this.cancelando()) {
      return;
    }

    this.cancelando.set(true);

    try {
      await this.agendamentoPublicoService.cancelarMeuAgendamento(item.id);
      this.toastService.success('Agendamento cancelado.');
      this.itemCancelar.set(null);
      await this.carregar();
    } catch {
      this.toastService.error('Não foi possível cancelar o agendamento.');
    } finally {
      this.cancelando.set(false);
      this.cdr.markForCheck();
    }
  }

  protected statusBadge(status: string): { classe: string; rotulo: string } {
    return STATUS_BADGE[status] ?? { classe: 'text-bg-secondary', rotulo: status };
  }

  /** Área de ações aparece para ativos futuros; os botões ficam desabilitados fora do prazo. */
  protected ativoFuturo(item: MeuAgendamentoItem): boolean {
    return (item.status === 'agendado' || item.status === 'confirmado')
      && new Date(item.dataInicio.replace('T', ' ').replace('Z', '')) > new Date();
  }

  protected formatarDataHora(data: string): string {
    const [dataParte, horaParte] = data.split('T');
    if (!dataParte || !horaParte) {
      return data;
    }

    const [ano, mes, dia] = dataParte.split('-');
    return `${dia}/${mes}/${ano} às ${horaParte.slice(0, 5)}`;
  }

  protected formatarPreco(preco: number): string {
    return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  /** Desconto em reais do cupom do item (0 sem cupom). */
  protected descontoItem(item: MeuAgendamentoItem): number {
    const percentual = item.cupomAniversarioPercentual ?? 0;
    return Math.max(0, Math.round(item.servicoPreco * percentual) / 100);
  }

  protected totalItem(item: MeuAgendamentoItem): number {
    return Math.max(0, item.servicoPreco - this.descontoItem(item));
  }
}
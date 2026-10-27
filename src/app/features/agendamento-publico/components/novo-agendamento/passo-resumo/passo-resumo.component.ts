import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TmButtonComponent } from '@techminds-group/tm-angular-lib';
import { ProfissionalDisponivel, ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';
import { AgendamentoPublicoService } from '../../../../../core/services/agendamento-publico.service';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';

/** Extras coletados no resumo antes de confirmar o agendamento (RN-080/078 — CR-004). */
export interface ConfirmarAgendamentoExtras {
  cupomAniversarioId?: string;
  dataNascimento?: string;
}

@Component({
  selector: 'app-passo-resumo',
  standalone: true,
  imports: [FormsModule, TmButtonComponent],
  templateUrl: './passo-resumo.component.html',
  styleUrl: './passo-resumo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassoResumoComponent {
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);

  readonly profissional = input.required<ProfissionalDisponivel | null>();
  readonly servico = input.required<ServicoDisponivel | null>();
  readonly data = input<string | null>(null);
  readonly horario = input<string | null>(null);
  readonly isLoading = input(false);
  /** Nome do plano quando o agendamento é via assinatura (incluso no plano). */
  readonly planoNome = input<string | null>(null);
  /** Duração em minutos quando o agendamento é via plano. */
  readonly duracao = input<number | null>(null);

  /**
   * RN-074 — modo lista de espera: o horário escolhido no passo 3 está OCUPADO; o
   * botão desta tela confirma a ENTRADA NA FILA (sem garantia de atendimento), não
   * o agendamento. O aviso destacado explica a condição antes da confirmação.
   */
  readonly modoListaEspera = input(false);
  /** CR-004 — modo remarcação: confirma a mudança de horário (cupom/nascimento ocultos). */
  readonly modoRemarcacao = input(false);
  /** RN-074 — entrada na fila confirmada: tela de sucesso substitui o resumo. */
  readonly listaEsperaSucesso = input(false);

  /** RN-080 (CR-004) — cliente logado tem data de nascimento cadastrada. */
  readonly clienteTemData = input(false);

  /** RN-078 (CR-004) — coleta de data de nascimento ativa no estabelecimento. */
  readonly coletaAtiva = input(false);

  readonly confirmar = output<ConfirmarAgendamentoExtras>();
  readonly voltarInicio = output<void>();
  readonly expandirImagem = output<{ url?: string; urls?: string[]; titulo: string }>();
  /** CR-004 — cupom validado/removido, para o resumo lateral do wizard exibir desconto. */
  readonly cupomAlterado = output<{ codigo: string; percentual: number } | null>();

  // RN-080 (CR-004) — cupom: checkbox → campo de código → validação antes de confirmar.
  protected readonly temCupom = signal(false);
  protected readonly codigoCupom = signal('');
  protected readonly cupomValidando = signal(false);
  protected readonly cupomErro = signal<string | null>(null);
  protected readonly cupomValidado = signal<{ id: string; codigo: string; percentual: number } | null>(null);

  /** Preço cheio do serviço (subtotal do resumo). */
  protected readonly precoServico = computed<number>(() => this.servico()?.preco ?? 0);

  /** Valor do desconto em reais com o cupom validado (0 sem cupom), arredondado em centavos. */
  protected readonly valorDesconto = computed<number>(() => {
    const cupom = this.cupomValidado();
    if (!cupom) {
      return 0;
    }

    return Math.max(0, Math.round(this.precoServico() * cupom.percentual) / 100);
  });

  /** Total com o desconto do cupom aplicado. */
  protected readonly totalComDesconto = computed<number>(() =>
    Math.max(0, this.precoServico() - this.valorDesconto()),
  );

  // RN-078 (CR-004) — coleta de data de nascimento (opcional, pode deixar em branco).
  protected readonly dataNascimento = signal('');

  protected async aplicarCupom(): Promise<void> {
    const codigo = this.codigoCupom().trim();
    if (codigo.length === 0 || this.cupomValidando()) {
      return;
    }

    this.cupomValidando.set(true);
    this.cupomErro.set(null);

    try {
      const cupom = await this.agendamentoPublicoService.validarCupomAniversario(codigo);
      this.cupomValidado.set({ id: cupom.cupomAniversarioId, codigo: cupom.codigo, percentual: cupom.percentualDesconto });
      this.cupomAlterado.emit({ codigo: cupom.codigo, percentual: cupom.percentualDesconto });
    } catch (err) {
      const httpError = err as { status?: number; error?: { message?: string } };
      this.cupomValidado.set(null);
      this.cupomAlterado.emit(null);
      this.cupomErro.set(this.mensagemErroCupom(httpError?.status, httpError?.error?.message));
    } finally {
      this.cupomValidando.set(false);
    }
  }

  protected removerCupom(): void {
    this.cupomValidado.set(null);
    this.cupomErro.set(null);
    this.codigoCupom.set('');
    this.cupomAlterado.emit(null);
  }

  protected confirmarAgendamento(): void {
    // Cupom digitado mas ainda não validado → valida antes de confirmar (evita perder o slot).
    if (this.temCupom() && this.cupomValidado() === null && this.codigoCupom().trim().length > 0) {
      void (async () => {
        await this.aplicarCupom();
        if (this.cupomValidado() !== null) {
          this.emitirConfirmacao();
        }
      })();
      return;
    }

    this.emitirConfirmacao();
  }

  private emitirConfirmacao(): void {
    const extras: ConfirmarAgendamentoExtras = {
      cupomAniversarioId: this.cupomValidado()?.id,
      dataNascimento: this.dataNascimento().trim() || undefined,
    };

    this.confirmar.emit(extras);
  }

  private mensagemErroCupom(status: number | undefined, mensagemBackend?: string): string {
    if (mensagemBackend) {
      return mensagemBackend;
    }

    if (status === 429) {
      return 'Muitas tentativas. Aguarde um instante e tente novamente.';
    }

    return 'Não foi possível validar o cupom. Tente novamente.';
  }

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

  /** Data de hoje em ISO (teto do input de nascimento — data futura inválida). */
  protected hojeISO(): string {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${hoje.getFullYear()}-${mes}-${dia}`;
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

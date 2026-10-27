import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { AniversarianteItemDTO, AniversariantesService } from '../../../../core/services/aniversariantes.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { envioParabensDisponivel } from '../../../../core/models/aniversariantes/aniversariantes.model';
import { EnviarParabensModalComponent } from '../../../../shared/components/modais/enviar-parabens-modal/enviar-parabens-modal.component';

/** Aba do widget de aniversariantes do dashboard (RN-078/CR-004). */
export type AbaAniversariantes = 'hoje' | '7dias' | 'atrasados';

/**
 * Widget "Aniversariantes" do dashboard (RN-078/CR-004): duas listas — Hoje e
 * Próximos 7 dias — com envio manual (modal sem campos) e status "✅ enviado".
 */
@Component({
  selector: 'app-aniversariantes-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, EnviarParabensModalComponent],
  templateUrl: './aniversariantes-widget.component.html',
  styleUrl: './aniversariantes-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AniversariantesWidgetComponent implements OnInit {
  private readonly aniversariantesService = inject(AniversariantesService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly abaAtiva = signal<AbaAniversariantes>('hoje');
  readonly carregando = signal(true);
  readonly enviando = signal(false);

  readonly aniversariantesHoje = signal<AniversarianteItemDTO[]>([]);
  readonly aniversariantesProximos = signal<AniversarianteItemDTO[]>([]);
  readonly aniversariantesAtrasados = signal<AniversarianteItemDTO[]>([]);

  readonly modalEnvioAberto = signal(false);
  readonly clienteSelecionado = signal<AniversarianteItemDTO | null>(null);

  /** Config carregada do menu (mensagem/desconto/validade do modal + conexão WhatsApp). */
  readonly mensagemConfig = signal<string | null>(null);
  readonly percentualPadrao = signal(0);
  readonly validadePadrao = signal<number | null>(null);
  readonly whatsappConectado = signal(true);
  readonly nomeEstabelecimento = signal('');

  protected readonly listaVisivel = computed<AniversarianteItemDTO[]>(() => {
    if (this.abaAtiva() === '7dias') {
      return this.aniversariantesProximos();
    }

    if (this.abaAtiva() === 'atrasados') {
      return this.aniversariantesAtrasados();
    }

    return this.aniversariantesHoje();
  });

  protected readonly vazioMensagem = computed<string>(() => {
    if (this.abaAtiva() === '7dias') {
      return 'Nenhum aniversariante nos próximos 7 dias.';
    }

    if (this.abaAtiva() === 'atrasados') {
      return 'Nenhum aniversário atrasado nos últimos 7 dias.';
    }

    return 'Nenhum aniversariante hoje.';
  });

  ngOnInit(): void {
    void this.carregar();
  }

  protected async carregar(): Promise<void> {
    this.carregando.set(true);

    try {
      const [hoje, proximos, atrasados, config, info] = await Promise.all([
        this.aniversariantesService.listar('hoje'),
        this.aniversariantesService.listar('7dias'),
        this.aniversariantesService.listar('atrasados'),
        this.aniversariantesService.obterConfig(),
        // Best-effort: nome real do estabelecimento para o {estabelecimento} do preview.
        this.estabelecimentoService.carregarInfo().catch(() => null),
      ]);

      this.aniversariantesHoje.set(hoje);
      this.aniversariantesProximos.set(proximos);
      this.aniversariantesAtrasados.set(atrasados);
      this.nomeEstabelecimento.set(info?.nomeExibicao || info?.nome || '');
      this.mensagemConfig.set(config.mensagem);
      this.percentualPadrao.set(config.percentualDescontoPadrao);
      this.validadePadrao.set(config.validadeDiasPadrao);
      this.whatsappConectado.set(config.whatsappConectado);
    } catch (err) {
      this.mostrarErro(err, 'Não foi possível carregar os aniversariantes.');
    } finally {
      this.carregando.set(false);
      this.cdr.markForCheck();
    }
  }

  protected alternarAba(aba: AbaAniversariantes): void {
    this.abaAtiva.set(aba);
  }

  protected abrirEnvio(item: AniversarianteItemDTO): void {
    this.clienteSelecionado.set(item);
    this.modalEnvioAberto.set(true);
    this.cdr.markForCheck();
  }

  /** Referência do template para a janela de envio (dia do aniversário + 7 dias). */
  protected readonly envioParabensDisponivel = envioParabensDisponivel;

  protected async confirmarEnvioParabens(clienteId: string): Promise<void> {
    this.enviando.set(true);

    try {
      const resultado = await this.aniversariantesService.enviarParabens(clienteId);
      this.modalEnvioAberto.set(false);
      this.clienteSelecionado.set(null);

      if (resultado.cupomId) {
        this.toastService.success(`Parabéns enviado com cupom de ${resultado.percentualDesconto}% válido por ${resultado.validadeDias} dia(s).`);
      } else {
        this.toastService.success('Parabéns enviado com sucesso.');
      }

      await this.carregar();
    } catch (err) {
      this.mostrarErro(err, 'Não foi possível enviar o parabéns.');
    } finally {
      this.enviando.set(false);
      this.cdr.markForCheck();
    }
  }

  private mostrarErro(err: unknown, fallback: string): void {
    const httpError = err as { error?: { message?: string } };
    this.toastService.error(httpError?.error?.message ?? fallback);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TmModalComponent, TmSelectComponent, TmTimeComponent } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublicoService } from '../../../../../core/services/agendamento-publico.service';
import { ProfissionalDisponivel, ServicoDisponivel } from '../../../../../core/models/agendamento-publico/agendamento-publico.model';
import { EntrarListaEsperaPayload } from '../../../../../core/models/lista-espera/lista-espera.model';
import { TemaPublicoService } from '../../../services/tema-publico.service';

/** Valor dos selects quando a preferência não foi escolhida (null no payload). */
const SEM_PREFERENCIA = '';

/**
 * Modal de preferências opcionais para entrar na lista de espera do dia (UI_SPEC §5.14/§6.4):
 * serviço desejado (catálogo ativo), profissional (com "Qualquer profissional" — RN-042)
 * e janela "a partir de que horas". O preset (slot ocupado clicado — RN-074) preenche os
 * campos por default; todos são opcionais. O componente pai executa a entrada (POST).
 */
@Component({
  selector: 'app-lista-espera-modal-preferencias',
  standalone: true,
  imports: [ReactiveFormsModule, TmModalComponent, TmSelectComponent, TmTimeComponent],
  templateUrl: './lista-espera-modal-preferencias.component.html',
  styleUrl: './lista-espera-modal-preferencias.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaEsperaModalPreferenciasComponent {
  private readonly fb = inject(FormBuilder);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly temaPublico = inject(TemaPublicoService);

  /** Tema escuro ativo na tela pública — repassado ao dropdown dos selects. */
  protected readonly isDark = computed(() => this.temaPublico.tema() === 'dark');

  readonly show = model<boolean>(false);
  /** Estado do POST no pai — bloqueia reenvio enquanto a entrada é criada. */
  readonly enviando = input(false);

  /**
   * Preferências pré-preenchidas (entrada via horário ocupado clicado — RN-074):
   * aplicadas ao abrir o modal, sobre os campos informados. `horaJanelaInicio`
   * do preset é o default do campo "a partir de que horas" quando vier preenchido.
   */
  readonly preset = input<Partial<EntrarListaEsperaPayload> | null>(null);

  readonly confirm = output<EntrarListaEsperaPayload>();

  readonly form = this.fb.group({
    servicoId: [SEM_PREFERENCIA],
    profissionalId: [SEM_PREFERENCIA],
    horaJanelaInicio: [SEM_PREFERENCIA],
  });

  private readonly _servicos = signal<ServicoDisponivel[]>([]);
  readonly servicos = this._servicos.asReadonly();

  private readonly _profissionais = signal<ProfissionalDisponivel[]>([]);
  readonly profissionais = this._profissionais.asReadonly();

  readonly carregandoOpcoes = signal(false);

  protected readonly servicoOptions = signal([{ value: SEM_PREFERENCIA, label: 'Qualquer serviço' }]);

  protected readonly profissionalOptions = signal([
    { value: SEM_PREFERENCIA, label: 'Qualquer profissional' },
  ]);

  constructor() {
    // Recarrega as opções do catálogo e reaplica o preset sempre que o modal é aberto
    effect(() => {
      if (this.show()) {
        const preset = this.preset();
        this.form.reset({
          servicoId: preset?.servicoId ?? SEM_PREFERENCIA,
          profissionalId: preset?.profissionalId ?? SEM_PREFERENCIA,
          horaJanelaInicio: preset?.horaJanelaInicio ?? SEM_PREFERENCIA,
        });
        void this.carregarOpcoes();
      }
    });
  }

  /** União dos serviços ativos dos profissionais do portal (não há endpoint público de catálogo único). */
  private async carregarOpcoes(): Promise<void> {
    this.carregandoOpcoes.set(true);
    try {
      const profissionais = await this.agendamentoPublicoService.getProfissionais();
      this._profissionais.set(profissionais);
      const listas = await Promise.all(
        profissionais.map((p) =>
          this.agendamentoPublicoService.getServicosProfissional(p.id).catch(() => [] as ServicoDisponivel[]),
        ),
      );
      const unicos = new Map<string, ServicoDisponivel>();
      for (const lista of listas) {
        for (const servico of lista) {
          if (!unicos.has(servico.id)) {
            unicos.set(servico.id, servico);
          }
        }
      }
      this._servicos.set([...unicos.values()]);
      this.servicoOptions.set([
        { value: SEM_PREFERENCIA, label: 'Qualquer serviço' },
        ...this._servicos().map((s) => ({ value: s.id, label: s.nome })),
      ]);
      this.profissionalOptions.set([
        { value: SEM_PREFERENCIA, label: 'Qualquer profissional' },
        ...profissionais.map((p) => ({ value: p.id, label: p.nome })),
      ]);
    } catch {
      // Falha ao carregar opções: modal permanece com "qualquer" nas duas listas
    } finally {
      this.carregandoOpcoes.set(false);
    }
  }

  confirmar(): void {
    if (this.enviando()) {
      return;
    }
    const { servicoId, profissionalId, horaJanelaInicio } = this.form.getRawValue();
    this.confirm.emit({
      servicoId: servicoId || null,
      profissionalId: profissionalId || null,
      horaJanelaInicio: horaJanelaInicio || null,
    });
    this.show.set(false);
  }

  protected fechar(): void {
    this.show.set(false);
  }
}

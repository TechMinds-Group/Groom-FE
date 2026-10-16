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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmModalComponent, TmSelectComponent, TmTimeComponent, TmSelectOption } from '@techminds-group/tm-angular-lib';
import { ClientesService } from '../../../../../core/services/clientes.service';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { GestaoUsuariosService } from '../../../../../core/services/gestao-usuarios.service';
import { ThemeService } from '../../../../../core/services/theme.service';
import { AdicionarListaEsperaPayload } from '../../../../../core/models/lista-espera/lista-espera.model';

/** Valor dos selects opcionais quando a preferência não foi escolhida (null no payload). */
const SEM_PREFERENCIA = '';

/**
 * Modal da recepção para adicionar cliente à lista de espera do dia (regra 1 do
 * RN-074 — UI_SPEC §5.15): cliente obrigatório, serviço/profissional/janela
 * opcionais. O componente pai executa o POST e recarrega a tabela.
 */
@Component({
  selector: 'app-modal-adicionar-entrada',
  standalone: true,
  imports: [ReactiveFormsModule, TmModalComponent, TmSelectComponent, TmTimeComponent],
  templateUrl: './modal-adicionar-entrada.component.html',
  styleUrl: './modal-adicionar-entrada.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalAdicionarEntradaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clientesService = inject(ClientesService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  protected readonly themeService = inject(ThemeService);

  readonly show = model<boolean>(false);
  /** Estado do POST no pai — bloqueia reenvio enquanto a entrada é criada. */
  readonly enviando = input(false);

  readonly confirm = output<AdicionarListaEsperaPayload>();

  readonly form = this.fb.nonNullable.group({
    clienteId: ['', Validators.required],
    servicoId: [SEM_PREFERENCIA],
    profissionalId: [SEM_PREFERENCIA],
    horaJanelaInicio: [SEM_PREFERENCIA],
  });

  /** Label do cliente no padrão do painel da agenda: "Nome Sobrenome (celular)". */
  protected readonly clienteOptions = computed<TmSelectOption<string>[]>(() => {
    const clientes = this.clientesService
      .clientes()
      .filter((c) => c.status === 'Ativo');
    return clientes.map((c) => {
      const nomeCompleto = this.getNomeClienteExibicao(c);
      return {
        value: c.id,
        label: c.celular ? `${nomeCompleto} (${c.celular})` : nomeCompleto,
      };
    });
  });

  protected readonly servicoOptions = signal<TmSelectOption<string>[]>([
    { value: SEM_PREFERENCIA, label: 'Qualquer serviço' },
  ]);

  protected readonly profissionalOptions = signal<TmSelectOption<string>[]>([
    { value: SEM_PREFERENCIA, label: 'Qualquer profissional' },
  ]);

  readonly carregandoOpcoes = signal(false);

  constructor() {
    // Recarrega as opções de cliente/serviço/profissional sempre que o modal é aberto
    effect(() => {
      if (this.show()) {
        this.form.reset({
          clienteId: '',
          servicoId: SEM_PREFERENCIA,
          profissionalId: SEM_PREFERENCIA,
          horaJanelaInicio: SEM_PREFERENCIA,
        });
        void this.carregarOpcoes();
      }
    });
  }

  private getNomeClienteExibicao(c: { nome: string; sobrenome?: string | null }): string {
    const nome = c.nome ? c.nome.trim() : '';
    const sobrenome = c.sobrenome ? c.sobrenome.trim() : '';
    if (!sobrenome) return nome;
    if (nome.toLowerCase().endsWith(sobrenome.toLowerCase())) return nome;
    return `${nome} ${sobrenome}`;
  }

  private async carregarOpcoes(): Promise<void> {
    this.carregandoOpcoes.set(true);
    try {
      await Promise.all([
        this.clientesService.carregarClientes(),
        this.catalogoService
          .carregarServicos()
          .then(() => {
            this.servicoOptions.set([
              { value: SEM_PREFERENCIA, label: 'Qualquer serviço' },
              ...this.catalogoService
                .servicos()
                .filter((s) => !s.status || s.status === 'Ativo' || s.status.toLowerCase() === 'ativo')
                .map((s) => ({ value: s.id, label: s.nome })),
            ]);
          })
          .catch(() => {
            // Sem catálogo: modal permanece apenas com "Qualquer serviço"
          }),
        this.gestaoUsuariosService
          .carregarUsuarios()
          .then(() => {
            this.profissionalOptions.set([
              { value: SEM_PREFERENCIA, label: 'Qualquer profissional' },
              ...this.gestaoUsuariosService
                .usuarios()
                .filter((u) => u.perfil === 'Profissional' || (u.perfil && u.perfil.includes('Profissional')))
                .map((u) => ({ value: u.id, label: u.sobrenome ? `${u.nome} ${u.sobrenome}` : u.nome })),
            ]);
          })
          .catch(() => {
            // Sem profissionais: modal permanece apenas com "Qualquer profissional"
          }),
      ]);
    } catch {
      // Falha ao carregar clientes: o select permanece vazio e o POST não é enviado (required)
    } finally {
      this.carregandoOpcoes.set(false);
    }
  }

  confirmar(): void {
    if (this.enviando() || this.form.controls.clienteId.invalid) {
      this.form.controls.clienteId.markAsTouched();
      return;
    }
    const { clienteId, servicoId, profissionalId, horaJanelaInicio } = this.form.getRawValue();
    this.confirm.emit({
      clienteId,
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

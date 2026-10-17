import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  model,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import {
  TemaCampoCor,
  TemaEditorForm,
  TEMA_CORES_PADRAO,
  TEMA_DIRECOES_LABELS,
  TEMA_ERRO_CAMPO,
  TEMA_GRUPOS,
  camposEscurosDeSugestao,
  criarCamposVazios,
  formDePayload,
  labelDeSlot,
  payloadDeForm,
  temaPreviewDeForm,
  usoDeSlot,
} from '../../models/tema-editor.model';
import { TemaValidacaoService, TEMA_HEX_REGEX } from '../../services/tema-validacao.service';
import {
  TemaDirecaoGradiente,
  TemaLeitura,
  TemaModoPaleta,
  TemaOrigem,
  TEMA_SLOTS_BASE,
  TEMA_SLOTS_ESCURO,
} from '../../../../core/models/tema/tema.model';
import { TemaService } from '../../../../core/services/tema.service';
import { TemaVisualService } from '../../../../core/services/tema-visual.service';
import { TemaPreviewComponent } from '../tema-preview/tema-preview.component';
import { TemaRestaurarModalComponent } from '../modais/tema-restaurar-modal/tema-restaurar-modal.component';

/** Grupo de cor do formulário: base ou escuro. */
type GrupoForm = 'base' | 'escuro';

/** Seções colapsáveis do editor (accordions — estado no componente). */
type SecaoEditor = 'paleta' | 'escuro' | 'identidade' | 'tokens';

/** Seções abertas por padrão (primeira visita — tudo visível). */
const SECOES_INICIAIS: Record<SecaoEditor, boolean> = {
  paleta: true,
  escuro: true,
  identidade: true,
  tokens: true,
};

/**
 * Editor de Tema Visual (RN-098..103 — UI_SPEC §5.30/§6.8), rota /configuracoes/tema.
 * Preview ao vivo (sticky), toggle Sólido/Gradiente por slot (CR-001), validações no
 * cliente (RN-101) com tratamento dos erros `Tema.*` do servidor (toast + campo destacado,
 * mantendo as edições), geração do modo oposto (RN-102 — preview only) e
 * restauração do padrão com confirmação (RN-103).
 */
@Component({
  selector: 'app-tema-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, TemaPreviewComponent, TemaRestaurarModalComponent],
  providers: [TemaValidacaoService],
  templateUrl: './tema-editor.component.html',
  styleUrl: './tema-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemaEditorComponent implements OnInit {
  private readonly temaService = inject(TemaService);
  private readonly temaVisual = inject(TemaVisualService);
  private readonly toastService = inject(TmToastService);
  private readonly validacao = inject(TemaValidacaoService);

  protected readonly slotsBase = TEMA_SLOTS_BASE;
  protected readonly slotsEscuro = TEMA_SLOTS_ESCURO;
  protected readonly direcoes = TEMA_DIRECOES_LABELS;
  protected readonly labelDeSlot = labelDeSlot;
  protected readonly usoDeSlot = usoDeSlot;
  protected readonly grupos = TEMA_GRUPOS;

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly gerando = signal(false);
  protected readonly configurado = signal(false);
  /** Estado dos accordions (Paleta base / Modo escuro / Identidade / Tokens). */
  protected readonly secoesAbertas = signal<Record<SecaoEditor, boolean>>(SECOES_INICIAIS);
  protected readonly modoPaleta = signal<TemaModoPaleta>('Unica');
  protected readonly base = signal<Record<string, TemaCampoCor>>(criarCamposVazios(TEMA_SLOTS_BASE));
  protected readonly escuro = signal<Record<string, TemaCampoCor>>(criarCamposVazios(TEMA_SLOTS_ESCURO));
  protected readonly logoUrl = signal('');
  protected readonly fonteTitulo = signal('');
  protected readonly fonteCorpo = signal('');
  protected readonly tokensJson = signal('');

  /** Campo/grupo destacado após erro local ou do servidor (§6.8 — destaque mantendo as edições). */
  protected readonly campoDestacado = signal<string | null>(null);
  protected readonly erroLocal = signal<string | null>(null);

  /** Fallback do preview do logo quando a URL configurada falha ao carregar (RN-100). */
  protected readonly logoErro = signal(false);

  /** Modal de confirmação da restauração (RN-103). */
  protected readonly modalRestaurar = model(false);

  /** Preview ao vivo: payload sintético montado do formulário a cada mudança (fiel ao form). */
  protected readonly temaPreview = computed<TemaLeitura>(() => temaPreviewDeForm(this.montarForm()));

  /** Alterna a seção colapsável (accordion — UI_SPEC §5.30). */
  protected alternarSecao(secao: SecaoEditor): void {
    this.secoesAbertas.update((estado) => ({ ...estado, [secao]: !estado[secao] }));
  }

  /** Logo válido exibido no preview de identidade (http(s) — §6.8). */
  protected readonly logoPreviewVisivel = computed(() => {
    const url = this.logoUrl().trim();
    return !!url && this.validacao.logoUrlValida(url) && !this.logoErro();
  });

  ngOnInit(): void {
    void this.recarregar();
  }

  /** Carrega o tema salvo, o coloca como base do formulário/preview e o aplica em runtime. */
  protected async recarregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const tema = await this.temaService.obterTema();
      this.carregarDePayload(tema);
      this.temaVisual.aplicar(tema);
    } catch {
      // Fallback RN-100 — leitura nunca bloqueia o editor.
    } finally {
      this.carregando.set(false);
    }
  }

  /** Alterna o modo da paleta (RN-099): Unica limpa o grupo escuro do formulário. */
  protected definirModoPaleta(modo: TemaModoPaleta): void {
    this.modoPaleta.set(modo);
    if (modo === 'Unica') {
      this.escuro.set(criarCamposVazios(TEMA_SLOTS_ESCURO));
    }
    this.limparErros();
  }

  protected atualizarCampo(
    grupo: GrupoForm,
    slot: string,
    patch: Partial<TemaCampoCor>,
  ): void {
    const sinal = grupo === 'base' ? this.base : this.escuro;
    sinal.update((campos) => ({
      ...campos,
      [slot]: { ...campos[slot], ...patch },
    }));
    this.limparErros();
  }

  protected definirCor(
    grupo: GrupoForm,
    slot: string,
    prop: 'cor' | 'cor1' | 'cor2',
    valor: string,
  ): void {
    // Color picker emite hex em minúsculas; normaliza para o formato #RRGGBB (§6.8).
    const hex = valor.toUpperCase();
    if (prop === 'cor') {
      this.atualizarCampo(grupo, slot, { cor: hex, cor1: hex });
    } else {
      this.atualizarCampo(grupo, slot, { [prop]: hex });
    }
  }

  protected definirDirecao(grupo: GrupoForm, slot: string, direcao: TemaDirecaoGradiente): void {
    this.atualizarCampo(grupo, slot, { direcao });
  }

  /** Grupo de cor do formulário para a config de exibição (base | escuro). */
  protected nomeGrupo(escuro: boolean): GrupoForm {
    return escuro ? 'escuro' : 'base';
  }

  /** Campos do grupo (base ou escuro) para o template. */
  protected camposDe(escuro: boolean): Record<string, TemaCampoCor> {
    return escuro ? this.escuro() : this.base();
  }

  /** Hex válida para o input type="color" (exige #RRGGBB; fallback neutro quando inválida). */
  protected hexPicker(cor: string): string {
    return TEMA_HEX_REGEX.test(cor) ? cor : '#000000';
  }

  /** Valor do input que disparou o evento (evita $any no template). */
  protected valorEntrada(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  /** Direção selecionada no select do gradiente (CR-001). */
  protected direcaoEntrada(evento: Event): TemaDirecaoGradiente {
    return (evento.target as HTMLSelectElement).value as TemaDirecaoGradiente;
  }

  /** Pré-visualização do gradiente no seletor do slot (CR-001). */
  protected estiloGradiente(grupo: GrupoForm, slot: string): string | null {
    const campo = (grupo === 'base' ? this.base : this.escuro)()[slot];
    if (!campo || campo.tipo !== 'gradiente') {
      return null;
    }
    return this.temaVisual.montarLinearGradient(campo);
  }

  /** Salva o tema (PUT — upsert §19.2) após as validações do cliente (RN-101). */
  protected async salvar(): Promise<void> {
    if (this.salvando()) {
      return;
    }
    this.limparErros();

    const erro = this.validarFormulario();
    if (erro) {
      this.aplicarErroLocal(erro.campo, erro.mensagem);
      return;
    }

    this.salvando.set(true);
    try {
      const payload = payloadDeForm(this.montarForm());
      const salvo = await this.temaService.salvarTema(payload);
      this.carregarDePayload(salvo);
      this.temaVisual.aplicar(salvo);
      this.toastService.success('Tema atualizado com sucesso.', 'Tema Visual');
    } catch (error) {
      this.tratarErroServidor(error);
    } finally {
      this.salvando.set(false);
    }
  }

  /**
   * Gera a paleta do modo oposto (RN-102): spinner → grupo escuro preenchido com a
   * sugestão (incluindo gradientes convertidos — CR-001). Nada persiste até Salvar.
   */
  protected async gerarModoOposto(): Promise<void> {
    if (this.gerando()) {
      return;
    }
    this.limparErros();
    // O grupo gerado é o escuro: lado de referência = claro (§19.3).
    const origem: TemaOrigem = 'claro';
    this.gerando.set(true);
    try {
      const sugestao = await this.temaService.gerarModoOposto(origem);
      this.escuro.set(camposEscurosDeSugestao(sugestao));
      this.toastService.info(
        'Sugestão gerada. Revise o grupo de cores escuras e clique em Salvar para persistir.',
        'Gerar do modo oposto',
      );
    } catch (error) {
      this.tratarErroServidor(error);
    } finally {
      this.gerando.set(false);
    }
  }

  /** Abre o modal de confirmação (prévia do padrão antes de qualquer efeito — RN-103). */
  protected abrirRestaurar(): void {
    this.modalRestaurar.set(true);
  }

  /** Confirmou a restauração: DELETE (idempotente) → payload recarregado → estado "Tema padrão". */
  protected async confirmarRestaurar(): Promise<void> {
    this.modalRestaurar.set(false);
    this.limparErros();
    try {
      await this.temaService.restaurarPadrao();
      await this.recarregar();
      this.toastService.success('Tema restaurado para o padrão do sistema.', 'Tema Visual');
    } catch (error) {
      this.tratarErroServidor(error);
    }
  }

  protected logoFalhou(): void {
    this.logoErro.set(true);
  }

  protected logoRecuperado(): void {
    this.logoErro.set(false);
  }

  /** Validações do cliente (§6.8) — retorno com campo destacável; null quando válido. */
  private validarFormulario(): {
    campo: string;
    mensagem: string;
  } | null {
    const form = this.montarForm();

    for (const slot of TEMA_SLOTS_BASE) {
      if (!this.validacao.campoCorValido(form.base[slot])) {
        return {
          campo: slot,
          mensagem: `Cor inválida em ${labelDeSlot(slot)} — use o formato #RRGGBB (sólido) ou duas cores válidas e direção (gradiente).`,
        };
      }
    }

    if (!this.validacao.logoUrlValida(form.logoUrl)) {
      return { campo: 'logoUrl', mensagem: 'URL do logo inválida — informe uma URL absoluta http(s).' };
    }

    if (!this.validacao.tokensValidos(form.tokensJson)) {
      return { campo: 'tokens', mensagem: 'Tokens devem ser um objeto JSON válido (ex.: { "raio": "8px" }).' };
    }

    if (form.modoPaleta === 'PorModo' && !this.validacao.modoPorModoCompleto(form)) {
      return {
        campo: 'escuro',
        mensagem: 'Modo PorModo exige as 5 cores escuras preenchidas antes de salvar.',
      };
    }

    const contraste = this.validacao.contrasteValido(form);
    if (!contraste.valido) {
      return {
        campo: contraste.campo ?? 'cores',
        mensagem: contraste.mensagem ?? 'Contraste insuficiente.',
      };
    }

    return null;
  }

  private montarForm(): TemaEditorForm {
    return {
      modoPaleta: this.modoPaleta(),
      base: this.base(),
      escuro: this.escuro(),
      logoUrl: this.logoUrl(),
      fonteTitulo: this.fonteTitulo(),
      fonteCorpo: this.fonteCorpo(),
      tokensJson: this.tokensJson(),
    };
  }

  private carregarDePayload(tema: TemaLeitura): void {
    const form = formDePayload(tema, TEMA_CORES_PADRAO);
    this.configurado.set(tema.configurado);
    this.modoPaleta.set(form.modoPaleta);
    this.base.set(form.base);
    this.escuro.set(form.escuro);
    this.logoUrl.set(form.logoUrl);
    this.fonteTitulo.set(form.fonteTitulo);
    this.fonteCorpo.set(form.fonteCorpo);
    this.tokensJson.set(form.tokensJson);
    this.logoErro.set(false);
    this.limparErros();
  }

  private aplicarErroLocal(campo: string, mensagem: string): void {
    this.campoDestacado.set(campo);
    this.erroLocal.set(mensagem);
    this.toastService.error(mensagem, 'Tema Visual');
  }

  /**
   * Tratamento dos erros `Tema.*` do servidor (§6.8): toast com a mensagem do catálogo
   * + campo correspondente destacado, mantendo as edições. Lockout segue o fluxo do
   * errorInterceptor (redireciona /assinatura — RN-104).
   */
  private tratarErroServidor(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.toastService.error('Erro inesperado ao salvar o tema.', 'Tema Visual');
      return;
    }

    const codigo = (error.error?.code as string | undefined) ?? '';
    const mensagem = (error.error?.message as string | undefined) ?? error.message;

    const campo = TEMA_ERRO_CAMPO[codigo];
    if (campo) {
      this.campoDestacado.set(campo);
    }
    if (codigo !== 'Assinatura.VencidaLockout') {
      this.erroLocal.set(mensagem);
      this.toastService.error(mensagem, 'Tema Visual');
    }
  }

  private limparErros(): void {
    this.campoDestacado.set(null);
    this.erroLocal.set(null);
  }
}

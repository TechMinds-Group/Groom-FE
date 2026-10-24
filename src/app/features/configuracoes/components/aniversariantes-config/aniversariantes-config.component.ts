import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableColumn, TmModalComponent, TmTableComponent, TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import {
  AniversarianteItemDTO,
  AniversariantesService,
  AniversarioConfigDTO,
  JanelaAniversariantes,
} from '../../../../core/services/aniversariantes.service';
import { MESES_ANO, montarComandoSalvar, montarPreviewMensagem } from '../../models/aniversariantes.model';
import { EnviarParabensModalComponent } from '../modais/enviar-parabens-modal/enviar-parabens-modal.component';

/**
 * Menu ConfiguraÃ§Ãµes â€º Aniversariantes (RN-078/079/080 â€” CR-004): mensagem de parabÃ©ns
 * com preview, cupom padrÃ£o (0% = sem desconto), envio automÃ¡tico, tabela de
 * aniversariantes (sÃ³ quem jÃ¡ agendou â‰¥1 vez) com flag "Auto" e "Enviar para todos",
 * coleta de data de nascimento e resumo de conversÃ£o.
 */
@Component({
  selector: 'app-aniversariantes-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTableComponent, TmModalComponent, TmTextComponent, EnviarParabensModalComponent],
  templateUrl: './aniversariantes-config.component.html',
  styleUrl: './aniversariantes-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AniversariantesConfigComponent implements OnInit, AfterViewInit {
  private readonly aniversariantesService = inject(AniversariantesService);
  private readonly toastService = inject(TmToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly location = inject(Location);

  @ViewChild('clienteTemplate', { static: true }) clienteTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('aniversarioTemplate', { static: true }) aniversarioTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('celularTemplate', { static: true }) celularTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('cupomTemplate', { static: true }) cupomTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('autoTemplate', { static: true }) autoTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('acoesTemplate', { static: true }) acoesTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;

  protected readonly templatesReady = signal(false);
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly enviandoTodos = signal(false);

  protected readonly config = signal<AniversarioConfigDTO | null>(null);
  protected readonly aniversariantes = signal<AniversarianteItemDTO[]>([]);
  protected readonly enviados = signal(0);
  protected readonly usados = signal(0);

  protected readonly busca = signal('');
  protected readonly mesSelecionado = signal<number>(new Date().getMonth() + 1);
  protected readonly mesesAno = MESES_ANO;

  protected readonly modalEnvioAberto = signal(false);
  protected readonly modalConfirmarTodosAberto = signal(false);
  protected readonly clienteSelecionado = signal<AniversarianteItemDTO | null>(null);

  readonly form = this.fb.group({
    mensagem: [''],
    percentual: [0, [Validators.min(0), Validators.max(100)]],
    validade: [null as number | null],
    envioAutomatico: [false],
    coletaDataNascimento: [false],
  });

  constructor() {
    // RN-080 â€” validade sÃ³ Ã© utilizÃ¡vel com desconto > 0: habilita/desabilita o controle
    // reativamente (tm-text recebe setDisabledState pelo control).
    this.form.controls.percentual.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.atualizarEstadoValidade());
    this.atualizarEstadoValidade();
  }

  /** Desconto atual do formulÃ¡rio (controla habilitaÃ§Ã£o da validade e o preview â€” RN-080). */
  get percentualAtual(): number {
    return Number(this.form.controls.percentual.value) || 0;
  }

  get validadeAtual(): number | null {
    const valor = this.form.controls.validade.value;
    return valor === null || valor === undefined ? null : Number(valor);
  }

  get cupomHabilitado(): boolean {
    return this.percentualAtual > 0 && this.validadeAtual !== null && this.validadeAtual >= 1;
  }

  /** Preview da mensagem recalculado do formulÃ¡rio (getters â€” controls nÃ£o sÃ£o signals). */
  get previewMensagem(): string {
    return montarPreviewMensagem(
      this.form.controls.mensagem.value,
      this.percentualAtual,
      this.validadeAtual,
    );
  }

  protected readonly whatsappConectado = computed<boolean>(() => this.config()?.whatsappConectado ?? false);

  protected readonly janelaTabela: JanelaAniversariantes = 'mes';

  protected readonly cols = computed<TableColumn<AniversarianteItemDTO>[]>(() => {
    if (this.templatesReady() === false) {
      return [];
    }

    return [
      { header: 'Cliente', template: this.clienteTemplate, width: '25%' },
      { header: 'AniversÃ¡rio', template: this.aniversarioTemplate, width: '15%' },
      { header: 'Celular', template: this.celularTemplate, width: '20%' },
      { header: 'Cupom deste ano', template: this.cupomTemplate, width: '25%' },
      { header: 'Auto', template: this.autoTemplate, width: '8%' },
      { header: '', template: this.acoesTemplate, width: '7%' },
    ];
  });

  ngOnInit(): void {
    void this.carregarTudo();
  }

  private atualizarEstadoValidade(): void {
    const controleValidade = this.form.controls.validade;

    if (this.percentualAtual <= 0) {
      controleValidade.disable({ emitEvent: false });
    } else {
      controleValidade.enable({ emitEvent: false });
    }
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
    this.cdr.markForCheck();
  }

  protected voltar(): void {
    this.location.back();
  }

  protected async carregarTudo(): Promise<void> {
    this.carregando.set(true);

    try {
      const [config, itens, resumo] = await Promise.all([
        this.aniversariantesService.obterConfig(),
        this.aniversariantesService.listar(this.janelaTabela, this.mesSelecionado(), this.busca()),
        this.aniversariantesService.obterResumo(),
      ]);

      this.config.set(config);
      this.form.patchValue({
        mensagem: config.mensagem ?? '',
        percentual: config.percentualDescontoPadrao,
        validade: config.validadeDiasPadrao,
        envioAutomatico: config.envioAutomatico,
        coletaDataNascimento: config.coletaDataNascimento,
      });
      this.aniversariantes.set(itens);
      this.enviados.set(resumo.enviados);
      this.usados.set(resumo.usados);
    } catch (err) {
      this.mostrarErro(err, 'NÃ£o foi possÃ­vel carregar as configuraÃ§Ãµes de aniversariantes.');
    } finally {
      this.carregando.set(false);
      this.cdr.markForCheck();
    }
  }

  protected async buscarLista(): Promise<void> {
    try {
      const itens = await this.aniversariantesService.listar(this.janelaTabela, this.mesSelecionado(), this.busca());
      this.aniversariantes.set(itens);
    } catch (err) {
      this.mostrarErro(err, 'NÃ£o foi possÃ­vel carregar a lista de aniversariantes.');
    } finally {
      this.cdr.markForCheck();
    }
  }

  protected async salvarConfig(): Promise<void> {
    const percentual = this.percentualAtual;
    const validade = this.validadeAtual;

    if (percentual > 0 && (validade === null || validade < 1)) {
      this.toastService.error('Informe a validade do cupom em dias (mÃ­nimo 1) quando houver desconto.');
      return;
    }

    this.salvando.set(true);

    try {
      const command = montarComandoSalvar(
        this.form.controls.mensagem.value,
        percentual,
        validade,
        this.form.controls.envioAutomatico.value === true,
        this.form.controls.coletaDataNascimento.value === true,
      );

      const config = await this.aniversariantesService.salvarConfig(command);
      this.config.set(config);
      this.toastService.success('ConfiguraÃ§Ã£o salva com sucesso.');
    } catch (err) {
      this.mostrarErro(err, 'NÃ£o foi possÃ­vel salvar a configuraÃ§Ã£o.');
    } finally {
      this.salvando.set(false);
      this.cdr.markForCheck();
    }
  }

  protected async alternarAuto(item: AniversarianteItemDTO, evento: Event): Promise<void> {
    const checkbox = evento.target as HTMLInputElement;

    try {
      await this.aniversariantesService.alternarAuto(item.clienteId, checkbox.checked);
      item.auto = checkbox.checked;
      this.toastService.success(checkbox.checked ? 'Envio automÃ¡tico ligado para o cliente.' : 'Envio automÃ¡tico desligado para o cliente.');
    } catch (err) {
      checkbox.checked = item.auto;
      this.mostrarErro(err, 'NÃ£o foi possÃ­vel atualizar o envio automÃ¡tico do cliente.');
    } finally {
      this.cdr.markForCheck();
    }
  }

  protected abrirEnviarTodos(): void {
    this.modalConfirmarTodosAberto.set(true);
  }

  protected async confirmarEnviarTodos(): Promise<void> {
    this.enviandoTodos.set(true);

    try {
      const resultado = await this.aniversariantesService.enviarTodos();
      this.toastService.success(`${resultado.marcados} cliente(s) com envio automÃ¡tico; ${resultado.puladosComCupom} pulado(s) por jÃ¡ terem cupom no ano.`);
      this.modalConfirmarTodosAberto.set(false);
      await this.buscarLista();
    } catch (err) {
      this.mostrarErro(err, 'NÃ£o foi possÃ­vel ligar o envio automÃ¡tico em massa.');
    } finally {
      this.enviandoTodos.set(false);
      this.cdr.markForCheck();
    }
  }

  protected abrirEnvio(item: AniversarianteItemDTO): void {
    this.clienteSelecionado.set(item);
    this.modalEnvioAberto.set(true);
    this.cdr.markForCheck();
  }

  protected async confirmarEnvioParabens(clienteId: string): Promise<void> {
    this.enviando.set(true);

    try {
      const resultado = await this.aniversariantesService.enviarParabens(clienteId);
      this.modalEnvioAberto.set(false);
      this.clienteSelecionado.set(null);

      if (resultado.cupomId) {
        this.toastService.success(`ParabÃ©ns enviado com cupom de ${resultado.percentualDesconto}% vÃ¡lido por ${resultado.validadeDias} dia(s).`);
      } else {
        this.toastService.success('ParabÃ©ns enviado com sucesso.');
      }

      await this.buscarLista();
    } catch (err) {
      this.mostrarErro(err, 'NÃ£o foi possÃ­vel enviar o parabÃ©ns.');
    } finally {
      this.enviando.set(false);
      this.cdr.markForCheck();
    }
  }

  protected mudarMes(evento: Event): void {
    const select = evento.target as HTMLSelectElement;
    this.mesSelecionado.set(Number(select.value));
    void this.buscarLista();
  }

  protected mudarBusca(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.busca.set(input.value);
    void this.buscarLista();
  }

  /** Mensagem do erro do backend (shape { code, message }) ou fallback genÃ©rico. */
  private mostrarErro(err: unknown, fallback: string): void {
    const httpError = err as { error?: { message?: string } };
    const mensagem = httpError?.error?.message ?? fallback;
    this.toastService.error(mensagem);
  }
}

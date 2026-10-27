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
import { TableColumn, TmButtonComponent, TmTableComponent, TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import {
  AniversarianteItemDTO,
  AniversariantesService,
  AniversarioConfigDTO,
  JanelaAniversariantes,
} from '../../../../core/services/aniversariantes.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { MENSAGEM_PADRAO_SEM_CUPOM, HORA_ENVIO_PADRAO, PADRAO_HORA_ENVIO, envioParabensDisponivel, montarComandoSalvar } from '../../../../core/models/aniversariantes/aniversariantes.model';
import { EnviarParabensModalComponent } from '../../../../shared/components/modais/enviar-parabens-modal/enviar-parabens-modal.component';

/**
 * Menu Configurações › Aniversariantes (RN-078/079/080 — CR-004): mensagem de parabéns
 * com prévia no modal de envio, cupom padrão (0% = sem desconto), envio automático,
 * tabela de aniversariantes (só quem já agendou ≥1 vez) com flag "Auto" individual e
 * em massa, coleta de data de nascimento e resumo de conversão.
 */
@Component({
  selector: 'app-aniversariantes-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTableComponent, TmTextComponent, TmButtonComponent, EnviarParabensModalComponent],
  templateUrl: './aniversariantes-config.component.html',
  styleUrl: './aniversariantes-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AniversariantesConfigComponent implements OnInit, AfterViewInit {
  private readonly aniversariantesService = inject(AniversariantesService);
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly location = inject(Location);

  @ViewChild('clienteTemplate', { static: true }) clienteTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('dataTemplate', { static: true }) dataTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('celularTemplate', { static: true }) celularTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('cupomTemplate', { static: true }) cupomTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('autoTemplate', { static: true }) autoTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;
  @ViewChild('acoesTemplate', { static: true }) acoesTemplate!: TemplateRef<{ $implicit: AniversarianteItemDTO }>;

  protected readonly templatesReady = signal(false);
  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly alternandoTodos = signal(false);

  protected readonly config = signal<AniversarioConfigDTO | null>(null);
  protected readonly aniversariantes = signal<AniversarianteItemDTO[]>([]);
  protected readonly enviados = signal(0);
  protected readonly usados = signal(0);

  /** Nome real do estabelecimento para o preview de {estabelecimento} (best-effort). */
  protected readonly nomeEstabelecimento = signal('');

  protected readonly modalEnvioAberto = signal(false);
  protected readonly clienteSelecionado = signal<AniversarianteItemDTO | null>(null);

  readonly form = this.fb.group({
    // Mensagem padrão pré-preenchida (usa {nome} e {estabelecimento} — pode ser editada).
    mensagem: [MENSAGEM_PADRAO_SEM_CUPOM],
    percentual: [0, [Validators.min(0), Validators.max(100)]],
    validade: [null as number | null],
    envioAutomatico: [false],
    // Hora do envio automático — 24h "HH:mm", fuso de Brasília (padrão 10:00).
    horaEnvio: [HORA_ENVIO_PADRAO, [Validators.pattern(PADRAO_HORA_ENVIO)]],
    coletaDataNascimento: [false],
  });

  constructor() {
    // RN-080 — validade só é utilizável com desconto > 0: habilita/desabilita o controle
    // reativamente (o HTML recria o tm-text na troca de estado — CVA do tm-text não
    // re-renderiza o campo interno em OnPush com o setDisabledState do control).
    this.form.controls.percentual.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((valor) => {
        this.normalizarPercentual(valor);
        this.atualizarEstadoValidade();
        this.cdr.markForCheck();
      });
    this.form.controls.validade.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((valor) => this.normalizarValidade(valor));
    this.atualizarEstadoValidade();
  }

  /** Desconto atual do formulário (controla a habilitação da validade — RN-080). */
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

  protected readonly whatsappConectado = computed<boolean>(() => this.config()?.whatsappConectado ?? false);

  protected readonly janelaTabela: JanelaAniversariantes = 'ano';

  protected readonly cols = computed<TableColumn<AniversarianteItemDTO>[]>(() => {
    if (this.templatesReady() === false) {
      return [];
    }

    return [
      { header: 'Cliente', template: this.clienteTemplate, width: '27%' },
      { header: 'Data', template: this.dataTemplate, width: '12%' },
      { header: 'Celular', template: this.celularTemplate, width: '23%' },
      { header: 'Cupom deste ano', template: this.cupomTemplate, width: '25%' },
      { header: 'Auto', template: this.autoTemplate, width: '7%' },
      { header: '', template: this.acoesTemplate, width: '6%' },
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

  /** Máscara do desconto: apenas dígitos (inteiros), limite máximo de 100 — valores maiores são rejeitados. */
  private normalizarPercentual(valor: string | number | null): void {
    const digitos = String(valor ?? '').replace(/\D/g, '').slice(0, 3);
    const normalizado = digitos === '' ? null : Math.min(parseInt(digitos, 10), 100);
    const atual = this.form.controls.percentual.value ?? null;

    if (atual === normalizado) {
      return;
    }

    this.form.controls.percentual.setValue(normalizado, { emitEvent: false });
  }

  /** Máscara da validade: apenas dígitos, máximo de 4 caracteres. */
  private normalizarValidade(valor: string | number | null): void {
    const digitos = String(valor ?? '').replace(/\D/g, '').slice(0, 4);
    const normalizado = digitos === '' ? null : Number(digitos);
    const atual = this.form.controls.validade.value ?? null;

    if (atual === normalizado) {
      return;
    }

    this.form.controls.validade.setValue(normalizado, { emitEvent: false });
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
      const [config, itens, resumo, info] = await Promise.all([
        this.aniversariantesService.obterConfig(),
        this.aniversariantesService.listar(this.janelaTabela),
        this.aniversariantesService.obterResumo(),
        // Best-effort: falha ao buscar o nome não deve derrubar o carregamento da página.
        this.estabelecimentoService.carregarInfo().catch(() => null),
      ]);

      this.config.set(config);
      this.nomeEstabelecimento.set(info?.nomeExibicao || info?.nome || '');
      this.form.patchValue({
        // Sem mensagem salva: exibe a mensagem padrão pré-preenchida (com {nome}/{estabelecimento}).
        mensagem: config.mensagem ?? MENSAGEM_PADRAO_SEM_CUPOM,
        percentual: config.percentualDescontoPadrao,
        validade: config.validadeDiasPadrao,
        envioAutomatico: config.envioAutomatico,
        horaEnvio: config.horaEnvioAutomatico || HORA_ENVIO_PADRAO,
        coletaDataNascimento: config.coletaDataNascimento,
      });
      this.aniversariantes.set(itens);
      this.enviados.set(resumo.enviados);
      this.usados.set(resumo.usados);
    } catch (err) {
      this.mostrarErro(err, 'Não foi possível carregar as configurações de aniversariantes.');
    } finally {
      this.carregando.set(false);
      this.cdr.markForCheck();
    }
  }

  protected async buscarLista(): Promise<void> {
    try {
      const itens = await this.aniversariantesService.listar(this.janelaTabela);
      this.aniversariantes.set(itens);
    } catch (err) {
      this.mostrarErro(err, 'Não foi possível carregar a lista de aniversariantes.');
    } finally {
      this.cdr.markForCheck();
    }
  }

  protected async salvarConfig(): Promise<void> {
    const percentual = this.percentualAtual;
    const validade = this.validadeAtual;

    if (percentual > 0 && (validade === null || validade < 1)) {
      this.toastService.error('Informe a validade do cupom em dias (mínimo 1) quando houver desconto.');
      return;
    }

    const horaEnvio = (this.form.controls.horaEnvio.value ?? '').trim();

    if (PADRAO_HORA_ENVIO.test(horaEnvio) === false) {
      this.toastService.error('Informe a hora do envio automático no formato 24h (HH:mm), de 00:00 a 23:59.');
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
        horaEnvio,
      );

      const config = await this.aniversariantesService.salvarConfig(command);
      this.config.set(config);
      this.toastService.success('Configuração salva com sucesso.');
    } catch (err) {
      this.mostrarErro(err, 'Não foi possível salvar a configuração.');
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
      this.toastService.success(checkbox.checked ? 'Envio automático ligado para o cliente.' : 'Envio automático desligado para o cliente.');
    } catch (err) {
      checkbox.checked = item.auto;
      this.mostrarErro(err, 'Não foi possível atualizar o envio automático do cliente.');
    } finally {
      this.cdr.markForCheck();
    }
  }

  /** Toggle mestre: ligado quando todos os clientes carregados estão com "Auto" ativo. */
  protected readonly todosAuto = computed<boolean>(() =>
    this.aniversariantes().length > 0 && this.aniversariantes().every((item) => item.auto),
  );

  protected async alternarAutoTodos(evento: Event): Promise<void> {
    const checkbox = evento.target as HTMLInputElement;
    const auto = checkbox.checked;

    this.alternandoTodos.set(true);

    try {
      await this.aniversariantesService.alternarAutoTodos(auto);
      this.aniversariantes.update((itens) => itens.map((item) => ({ ...item, auto })));
      this.toastService.success(auto ? 'Envio automático ligado para todos os aniversariantes.' : 'Envio automático desligado para todos os aniversariantes.');
    } catch (err) {
      checkbox.checked = !auto;
      this.mostrarErro(err, 'Não foi possível atualizar o envio automático em massa.');
    } finally {
      this.alternandoTodos.set(false);
      this.cdr.markForCheck();
    }
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

      await this.buscarLista();
    } catch (err) {
      this.mostrarErro(err, 'Não foi possível enviar o parabéns.');
    } finally {
      this.enviando.set(false);
      this.cdr.markForCheck();
    }
  }

  /** Mensagem do erro do backend (shape { code, message }) ou fallback genérico. */
  private mostrarErro(err: unknown, fallback: string): void {
    const httpError = err as { error?: { message?: string } };
    const mensagem = httpError?.error?.message ?? fallback;
    this.toastService.error(mensagem);
  }
}

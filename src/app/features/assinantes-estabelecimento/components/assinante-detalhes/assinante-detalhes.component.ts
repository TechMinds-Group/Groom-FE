import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  TableColumn,
  TmDateComponent,
  TmModalComponent,
  TmSelectComponent,
  TmSelectOption,
  TmTableComponent,
  TmTextComponent,
  TmToastService,
} from '@techminds-group/tm-angular-lib';
import { AssinantesService, ClienteAssinante } from '../../../../core/services/assinantes.service';
import { ClubesService } from '../../../../core/services/clubes.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { CompartilharService } from '../../../../core/services/compartilhar.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { StatusAssinanteBadgePipe } from '../../pipes/status-assinante.pipe';
import { AssinanteModalExcluirComponent } from '../modais/assinante-modal-excluir/assinante-modal-excluir.component';
import { AssinanteDetalhes, PagamentoAssinante } from '../../models/assinante-config.model';
import { AssinantesEstabelecimentoHelperService } from '../../services/assinantes-estabelecimento-helper.service';

const NOVO_CLIENTE_VALUE = '__novo_cliente__';

@Component({
  selector: 'app-assinante-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmSelectComponent,
    TmDateComponent,
    TmTableComponent,
    StatusAssinanteBadgePipe,
    AssinanteModalExcluirComponent,
  ],
  templateUrl: './assinante-detalhes.component.html',
  styleUrl: './assinante-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AssinantesEstabelecimentoHelperService],
})
export class AssinanteDetalhesComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  protected readonly assinantesService = inject(AssinantesService);
  private readonly clubesService = inject(ClubesService);
  private readonly clientesService = inject(ClientesService);
  private readonly compartilharService = inject(CompartilharService);
  protected readonly helper = inject(AssinantesEstabelecimentoHelperService);
  protected readonly themeService = inject(ThemeService);
  private readonly toastService = inject(TmToastService);

  @ViewChild('dataTemplate', { static: true }) dataTemplate!: TemplateRef<{ $implicit: PagamentoAssinante }>;
  @ViewChild('valorTemplate', { static: true }) valorTemplate!: TemplateRef<{ $implicit: PagamentoAssinante }>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<{ $implicit: PagamentoAssinante }>;

  private readonly templatesReady = signal(false);
  protected readonly tamanhoPaginaPagamentos = signal<number>(5);

  protected readonly colsPagamentos = computed<TableColumn<PagamentoAssinante>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Data', template: this.dataTemplate, width: '25%' },
      { header: 'Descrição', key: 'descricao', width: '35%' },
      { header: 'Valor', template: this.valorTemplate, width: '20%' },
      { header: 'Status', template: this.statusTemplate, width: '20%' },
    ];
  });

  protected readonly assinante = signal<AssinanteDetalhes | null>(null);
  protected readonly clienteOriginal = signal<ClienteAssinante | null>(null);
  protected readonly modoEdicao = signal<boolean>(false);
  protected readonly salvando = signal<boolean>(false);
  protected readonly showDeleteConfirmModal = signal<boolean>(false);

  protected readonly linkUrl = signal<string | null>(null);
  protected readonly linkExpiresAt = signal<string | null>(null);
  protected readonly gerandoLink = signal<boolean>(false);

  protected readonly form: FormGroup = this.fb.group({
    clienteId: ['', [Validators.required]],
    clubeId: ['', [Validators.required]],
    dataInicio: ['', [Validators.required]],
    status: ['Ativo'],
  });

  protected readonly clienteOptions = computed<TmSelectOption[]>(() => {
    const opcoes = this.clientesService.clientes().map((c) => ({
      value: c.id,
      label: `${c.nome} (${c.celular})`,
    }));
    return [...opcoes, { value: NOVO_CLIENTE_VALUE, label: '+ Cadastrar novo cliente' }];
  });

  protected readonly clubeOptions = computed<TmSelectOption[]>(() => {
    return this.clubesService.clubes().map((clube) => ({
      value: clube.id,
      label: `${clube.nome} (R$ ${clube.preco.toFixed(2).replace('.', ',')})`,
    }));
  });

  protected readonly clienteSelecionadoInfo = computed(() => {
    const id = this.form.get('clienteId')?.value;
    if (!id || id === NOVO_CLIENTE_VALUE) return null;
    return this.clientesService.clientes().find((c) => c.id === id) || null;
  });

  ngOnInit(): void {
    this.clientesService.carregarClientes();
    this.clubesService.carregarClubes().subscribe();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.carregarAssinante(id);
    }
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  voltar(): void {
    this.router.navigate(['/gestao/assinantes']);
  }

  protected onClienteSelectChange(valor: unknown): void {
    if (valor === NOVO_CLIENTE_VALUE) {
      this.form.get('clienteId')?.setValue('');
      this.router.navigate(['/gestao/clientes/novo'], { queryParams: { origem: 'assinantes' } });
    }
  }

  protected habilitarEdicao(): void {
    const orig = this.clienteOriginal();
    if (orig) {
      this.preencherFormulario(orig);
      this.modoEdicao.set(true);
    }
  }

  protected cancelarEdicao(): void {
    this.modoEdicao.set(false);
  }

  protected alternarStatus(event: Event): void {
    const alvo = event.target as HTMLInputElement;
    this.form.get('status')?.setValue(alvo.checked ? 'Ativo' : 'Pendente');
  }

  protected async salvarGeral(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Selecione um cliente já cadastrado e preencha os campos obrigatórios.', 'Atenção');
      return;
    }

    const a = this.assinante();
    if (!a) return;

    const raw = this.form.value;
    const cliente = this.clientesService.clientes().find((c) => c.id === raw.clienteId);
    const orig = this.clienteOriginal();

    const clienteNome = cliente ? cliente.nome : orig?.clienteNome || '';
    const clienteEmail = cliente ? cliente.email : orig?.clienteEmail || '';
    const celular = cliente ? cliente.celular : orig?.celular || '';

    this.salvando.set(true);
    try {
      await this.assinantesService.atualizar(a.id, {
        clienteNome,
        clienteEmail,
        celular,
        clubeId: raw.clubeId,
        dataInicio: raw.dataInicio,
        status: raw.status,
      });

      this.toastService.success('Assinatura atualizada com sucesso!', 'Sucesso');
      await this.carregarAssinante(a.id);
      this.modoEdicao.set(false);
    } catch (err) {
      console.error('Erro ao salvar alterações da assinatura', err);
      this.toastService.error('Erro ao salvar alterações da assinatura.', 'Erro');
    } finally {
      this.salvando.set(false);
    }
  }

  excluir(): void {
    this.showDeleteConfirmModal.set(true);
  }

  async confirmarExcluir(): Promise<void> {
    const a = this.assinante();
    if (!a) return;

    await this.assinantesService.excluir(a.id);
    this.showDeleteConfirmModal.set(false);
    this.toastService.success('Assinatura excluída com sucesso!', 'Sucesso');
    this.voltar();
  }

  async gerarLink(): Promise<void> {
    const a = this.assinante();
    if (!a) return;

    this.gerandoLink.set(true);
    try {
      const response = await this.compartilharService.gerarLink(a.id).toPromise();
      if (response) {
        const baseUrl = window.location.origin;
        this.linkUrl.set(`${baseUrl}${response.url}`);
        this.linkExpiresAt.set(response.expiresAt);
      }
    } catch {
      this.linkUrl.set(null);
      this.linkExpiresAt.set(null);
      this.toastService.error('Erro ao gerar link compartilhável.', 'Erro');
    } finally {
      this.gerandoLink.set(false);
    }
  }

  copiarLink(): void {
    const url = this.linkUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      this.toastService.success('Link copiado para a área de transferência!', 'Sucesso');
    }
  }

  fecharLinkModal(): void {
    this.linkUrl.set(null);
    this.linkExpiresAt.set(null);
  }

  protected obterLinkWhatsapp(celular?: string): string {
    if (!celular) return '#';
    const num = celular.replace(/\D/g, '');
    const comDdi = num.startsWith('55') ? num : `55${num}`;
    return `https://wa.me/${comDdi}`;
  }

  private async carregarAssinante(id: string): Promise<void> {
    try {
      const cliente: ClienteAssinante = await this.assinantesService.carregarAssinantePorId(id);
      this.clienteOriginal.set(cliente);

      const pagamentos: PagamentoAssinante[] = [];
      const dateInicio = new Date(cliente.dataInicio + 'T00:00:00');
      const dateFim = new Date(cliente.dataFim + 'T00:00:00');

      let currentDate = new Date(dateInicio);
      let count = 1;
      const hoje = new Date();

      while (currentDate <= hoje && currentDate <= dateFim) {
        pagamentos.push({
          id: `p${count}`,
          data: currentDate.toISOString(),
          descricao: 'Renovação Mensal',
          valor: cliente.valor,
          status: 'Pago',
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
        count++;
      }

      if (cliente.status === 'Pendente') {
        pagamentos.push({
          id: `p-pendente`,
          data: dateInicio.toISOString(),
          descricao: 'Renovação Mensal',
          valor: cliente.valor,
          status: 'Pendente',
        });
      } else if (pagamentos.length === 0) {
        pagamentos.push({
          id: `p1`,
          data: dateInicio.toISOString(),
          descricao: 'Renovação Mensal',
          valor: cliente.valor,
          status: cliente.status === 'Expirado' ? 'Cancelado' : 'Pago',
        });
      }

      pagamentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const receitaGeradaLtv = pagamentos
        .filter((p) => p.status === 'Pago')
        .reduce((sum, p) => sum + p.valor, 0);

      this.assinante.set({
        id: cliente.id,
        clienteNome: cliente.clienteNome,
        clienteEmail: cliente.clienteEmail || '',
        telefone: cliente.celular,
        clubeNome: cliente.clubeNome,
        valorAssinatura: cliente.valor,
        status: cliente.status,
        dataInicio: cliente.dataInicio,
        dataRenovacao: cliente.dataFim,
        receitaGeradaLtv,
        historicoPagamentos: pagamentos,
      });

      if (this.modoEdicao()) {
        this.preencherFormulario(cliente);
      }
    } catch (err) {
      console.error('Erro ao carregar assinante', err);
      this.router.navigate(['/gestao/assinantes']);
    }
  }

  private preencherFormulario(orig: ClienteAssinante): void {
    const clienteEncontrado = this.clientesService.clientes().find(
      (c) => c.nome.toLowerCase() === orig.clienteNome.toLowerCase() || c.celular === orig.celular
    );

    this.form.patchValue({
      clienteId: clienteEncontrado ? clienteEncontrado.id : '',
      clubeId: orig.clubeId ?? '',
      dataInicio: this.helper.formatarDataParaInputDate(orig.dataInicio),
      status: orig.status ?? 'Ativo',
    });
  }
}

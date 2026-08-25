import { AfterViewInit, ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TableColumn, TmModalComponent, TmTableComponent, TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { ClientesService } from '../../../../core/services/clientes.service';
import { AgendamentosService } from '../../../../core/services/agendamentos.service';
import { Cliente } from '../../../../core/models/clientes/cliente.model';
import { Agendamento } from '../../../../core/models/agenda.model';
import { StatusClienteBadgePipe } from '../../pipes/status-cliente-badge.pipe';
import { ClientesHelperService } from '../../services/clientes-helper.service';
import { ClienteModalExcluirComponent } from '../modais/cliente-modal-excluir/cliente-modal-excluir.component';

@Component({
  selector: 'app-cliente-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmTextComponent,
    TmTableComponent,
    TmModalComponent,
    StatusClienteBadgePipe,
    ClienteModalExcluirComponent,
  ],
  templateUrl: './cliente-detalhes.component.html',
  styleUrl: './cliente-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientesHelperService],
})
export class ClienteDetalhesComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  protected readonly clientesService = inject(ClientesService);
  private readonly agendamentosService = inject(AgendamentosService);
  protected readonly helper = inject(ClientesHelperService);
  private readonly toastService = inject(TmToastService);

  @ViewChild('servicoTemplate', { static: true }) servicoTemplate!: TemplateRef<{ $implicit: Agendamento }>;
  @ViewChild('profissionalTemplate', { static: true }) profissionalTemplate!: TemplateRef<{ $implicit: Agendamento }>;
  @ViewChild('dataTemplate', { static: true }) dataTemplate!: TemplateRef<{ $implicit: Agendamento }>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<{ $implicit: Agendamento }>;

  private readonly templatesReady = signal(false);
  protected readonly tamanhoPaginaAgendamentos = signal<number>(5);

  protected readonly colsAgendamentos = computed<TableColumn<Agendamento>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Serviço', template: this.servicoTemplate, width: '30%' },
      { header: 'Profissional', template: this.profissionalTemplate, width: '30%' },
      { header: 'Data / Hora', template: this.dataTemplate, width: '25%' },
      { header: 'Status', template: this.statusTemplate, width: '15%' },
    ];
  });

  protected readonly cliente = signal<Cliente | null>(null);
  protected readonly agendamentosCliente = signal<Agendamento[]>([]);
  protected readonly modoEdicao = signal<boolean>(false);
  protected readonly salvando = signal<boolean>(false);

  protected readonly showDeleteConfirmModal = signal<boolean>(false);
  protected readonly showConfirmarAgendamentosFuturosModal = signal<boolean>(false);
  protected readonly mensagemConfirmacaoFuturos = signal<string>('');
  protected readonly mensagemErroExclusao = signal<string | null>(null);

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    sobrenome: ['', [Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    celular: ['', [Validators.required, Validators.maxLength(15)]],
    cpf: [''],
    dataNascimento: [''],
    observacoes: [''],
    status: ['Ativo'],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.carregarDados(id);
    }
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  voltar(): void {
    this.router.navigate(['/gestao/clientes']);
  }

  protected habilitarEdicao(): void {
    const c = this.cliente();
    if (c) {
      this.preencherFormulario(c);
      this.modoEdicao.set(true);
    }
  }

  protected cancelarEdicao(): void {
    this.modoEdicao.set(false);
  }

  protected alternarStatus(event: Event): void {
    const alvo = event.target as HTMLInputElement;
    this.form.get('status')?.setValue(alvo.checked ? 'Ativo' : 'Inativo');
  }

  protected async salvarGeral(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Preencha os campos obrigatórios do formulário.', 'Atenção');
      return;
    }

    const c = this.cliente();
    if (!c) return;

    const digitsCelular = (this.form.value.celular ?? '').replace(/\D/g, '');
    if (!digitsCelular || digitsCelular.length < 10 || digitsCelular.length > 13) {
      this.toastService.error('O número de celular / WhatsApp é obrigatório e deve ser válido.', 'Erro');
      return;
    }

    this.salvando.set(true);
    try {
      const raw = this.form.value;
      const partesNome = this.helper.separarNome(c);

      await this.clientesService.atualizar(c.id, {
        primeiroNome: raw.nome || partesNome.primeiroNome,
        sobrenome: raw.sobrenome ?? partesNome.sobrenome,
        email: raw.email,
        celular: digitsCelular,
        cpf: raw.cpf ? raw.cpf.replace(/\D/g, '') : undefined,
        dataNascimento: raw.dataNascimento || undefined,
        observacoes: raw.observacoes || undefined,
        status: raw.status,
      });

      this.toastService.success('Cliente atualizado com sucesso!', 'Sucesso');
      await this.carregarDados(c.id);
      this.modoEdicao.set(false);
    } catch (err) {
      console.error('Erro ao salvar alterações do cliente', err);
      this.toastService.error('Erro ao salvar alterações do cliente.', 'Erro');
    } finally {
      this.salvando.set(false);
    }
  }

  excluir(): void {
    this.mensagemErroExclusao.set(null);
    this.showDeleteConfirmModal.set(true);
  }

  async confirmarExcluir(confirmarFuturos = false): Promise<void> {
    const c = this.cliente();
    if (!c) return;

    try {
      await this.clientesService.excluir(c.id, confirmarFuturos);
      this.showDeleteConfirmModal.set(false);
      this.showConfirmarAgendamentosFuturosModal.set(false);
      this.toastService.success('Cliente excluído com sucesso!', 'Sucesso');
      this.voltar();
    } catch (err: unknown) {
      this.showDeleteConfirmModal.set(false);
      if (typeof err === 'object' && err !== null && 'requiresConfirmation' in err) {
        this.mensagemConfirmacaoFuturos.set((err as any).message || '');
        this.showConfirmarAgendamentosFuturosModal.set(true);
        return;
      }
      const mensagem = err instanceof Error ? err.message : 'Não é possível excluir o cliente.';
      this.mensagemErroExclusao.set(mensagem);
      this.toastService.error(mensagem, 'Erro ao Excluir');
    }
  }

  protected getNomeCompleto(c: Cliente): string {
    const partes = this.helper.separarNome(c);
    if (partes.sobrenome) {
      return `${partes.primeiroNome} ${partes.sobrenome}`;
    }
    return c.nome;
  }

  private async carregarDados(id: string): Promise<void> {
    try {
      const dadosCliente = await this.clientesService.carregarClientePorId(id);
      this.cliente.set(dadosCliente);

      await this.agendamentosService.carregarAgendamentos();
      const todosAgendamentos = this.agendamentosService.agendamentos();
      const doCliente = todosAgendamentos.filter(
        (a) => a.clienteId === id || (a.clienteNome && a.clienteNome.toLowerCase() === dadosCliente.nome.toLowerCase())
      );
      this.agendamentosCliente.set(doCliente);
    } catch (err) {
      console.error('Erro ao carregar detalhes do cliente', err);
      this.router.navigate(['/gestao/clientes']);
    }
  }

  private formatarCelular(numero: string): string {
    const digits = numero.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return numero;
  }

  private preencherFormulario(c: Cliente): void {
    const partes = this.helper.separarNome(c);
    this.form.patchValue({
      nome: partes.primeiroNome || c.nome,
      sobrenome: partes.sobrenome || '',
      email: c.email ?? '',
      celular: this.formatarCelular(c.celular ?? ''),
      cpf: this.helper.formatarCpf(c.cpf),
      dataNascimento: this.helper.formatarDataParaInputDate(c.dataNascimento),
      observacoes: c.observacoes ?? '',
      status: c.status ?? 'Ativo',
    });
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TmTableComponent, TableColumn, TmSelectOption } from '@techminds-group/tm-angular-lib';
import { AssinantesService, ClienteAssinante } from '../../../../core/services/assinantes.service';
import { ClubesService } from '../../../../core/services/clubes.service';
import { AssinanteDetalhesGeralComponent } from '../assinante-detalhes-geral/assinante-detalhes-geral.component';
import { AssinanteDetalhesAcoesComponent } from '../assinante-detalhes-acoes/assinante-detalhes-acoes.component';
import { AssinanteModalEditarComponent, AssinanteEdicaoPayload } from '../modais/assinante-modal-editar/assinante-modal-editar.component';
import { AssinanteModalExcluirComponent } from '../modais/assinante-modal-excluir/assinante-modal-excluir.component';
import { AssinanteDetalhes, PagamentoAssinante } from '../../models/assinante-config.model';
import { AssinantesEstabelecimentoHelperService } from '../../services/assinantes-estabelecimento-helper.service';

@Component({
  selector: 'app-assinante-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
    AssinanteDetalhesGeralComponent,
    AssinanteDetalhesAcoesComponent,
    AssinanteModalEditarComponent,
    AssinanteModalExcluirComponent,
  ],
  templateUrl: './assinante-detalhes.component.html',
  styleUrl: './assinante-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AssinantesEstabelecimentoHelperService],
})
export class AssinanteDetalhesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly assinantesService = inject(AssinantesService);
  private readonly clubesService = inject(ClubesService);

  protected readonly assinante = signal<AssinanteDetalhes | null>(null);
  protected readonly showEditModal = signal<boolean>(false);
  protected readonly showDeleteConfirmModal = signal<boolean>(false);

  protected readonly cols = signal<TableColumn<PagamentoAssinante>[]>([
    { header: 'Data', key: 'data', width: '25%' },
    { header: 'Descrição', key: 'descricao', width: '35%' },
    { header: 'Valor', key: 'valor', width: '20%' },
    { header: 'Status', key: 'status', width: '20%' },
  ]);

  protected readonly clubeOptions = computed<TmSelectOption[]>(() => {
    return this.clubesService.clubes().map((clube) => ({
      value: clube.id,
      label: `${clube.nome} (R$ ${clube.preco.toFixed(2).replace('.', ',')})`,
    }));
  });

  ngOnInit(): void {
    this.clubesService.carregarClubes().subscribe();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregarAssinante(id);
    }
  }

  voltar(): void {
    this.router.navigate(['/gestao/assinantes']);
  }

  abrirEdicao(): void {
    this.showEditModal.set(true);
  }

  async salvarEdicao(payload: AssinanteEdicaoPayload): Promise<void> {
    const a = this.assinante();
    if (!a) return;

    await this.assinantesService.atualizar(a.id, {
      clienteNome: payload.clienteNome,
      celular: payload.celular,
      clienteEmail: payload.clienteEmail,
      clubeId: payload.clubeId,
      dataInicio: payload.dataInicio,
    });
    this.showEditModal.set(false);
    await this.carregarAssinante(a.id);
  }

  excluir(): void {
    this.showDeleteConfirmModal.set(true);
  }

  async confirmarExcluir(): Promise<void> {
    const a = this.assinante();
    if (!a) return;

    await this.assinantesService.excluir(a.id);
    this.showDeleteConfirmModal.set(false);
    this.voltar();
  }

  private async carregarAssinante(id: string): Promise<void> {
    try {
      const cliente: ClienteAssinante = await this.assinantesService.carregarAssinantePorId(id);

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
    } catch (err) {
      console.error('Erro ao carregar assinante:', err);
      this.router.navigate(['/gestao/assinantes']);
    }
  }
}

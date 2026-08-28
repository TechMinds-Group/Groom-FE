import { AfterViewInit, ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TmTableComponent, TableColumn } from '@techminds-group/tm-angular-lib';
import { CompartilharService, AssinantePublico } from '../../../core/services/compartilhar.service';
import { AppFooterComponent } from '../../../shared/components/footer/app-footer.component';

interface PagamentoVisualizacao {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  status: string;
}

@Component({
  selector: 'app-visualizar-assinante',
  standalone: true,
  imports: [CommonModule, TmTableComponent, AppFooterComponent],
  template: `
    <div class="public-view">
      <div class="container py-5">
        @if (erro(); as msg) {
          <div class="row justify-content-center">
            <div class="col-md-6 text-center py-5">
              <i class="fas fa-link-slash text-muted" style="font-size: 3rem;"></i>
              <h4 class="mt-4 fw-bold">Link inválido ou expirado</h4>
              <p class="text-muted">{{ msg }}</p>
            </div>
          </div>
        } @else if (carregando()) {
          <div class="row justify-content-center">
            <div class="col-md-6 text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Carregando...</span>
              </div>
              <p class="text-muted mt-3">Carregando informações...</p>
            </div>
          </div>
        } @else {
          @if (assinante(); as a) {
            <div class="row justify-content-center">
              <div class="col-lg-8">
                <div class="text-center mb-4">
                  <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                    <i class="fas fa-eye me-1"></i>Visualização de Cliente
                  </span>
                  @if (diasLinkRestantes(); as d) {
                    <span class="badge bg-info bg-opacity-10 text-info px-3 py-2 rounded-pill ms-2">
                      <i class="fas fa-clock me-1"></i>Link válido por mais {{ d }} {{ d === 1 ? 'dia' : 'dias' }}
                    </span>
                  }
                </div>

                <div class="card border-0 shadow-sm p-4 mb-4">
                  <div class="d-flex align-items-center gap-3 border-bottom pb-4 mb-4">
                    <div class="avatar-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center">
                      <i class="fas fa-user fs-3"></i>
                    </div>
                    <div>
                      <h2 class="h3 fw-bold mb-1">{{ a.clienteNome }}</h2>
                      <p class="text-muted mb-0">{{ a.clienteEmail }}</p>
                    </div>
                  </div>

                  <div class="row g-4">
                    <div class="col-sm-6 col-12">
                      <label class="form-label small fw-bold text-muted text-uppercase">Status</label>
                      <div>
                        <span class="badge border px-3 py-2 rounded-pill fw-semibold"
                          [class.bg-success-subtle]="a.status === 'Ativo'"
                          [class.text-success]="a.status === 'Ativo'"
                          [class.border-success-subtle]="a.status === 'Ativo'"
                          [class.bg-warning-subtle]="a.status === 'Pendente'"
                          [class.text-warning]="a.status === 'Pendente'"
                          [class.border-warning-subtle]="a.status === 'Pendente'"
                          [class.bg-danger-subtle]="a.status === 'Expirado'"
                          [class.text-danger]="a.status === 'Expirado'"
                          [class.border-danger-subtle]="a.status === 'Expirado'">
                          <i class="fas fa-circle me-1 small"></i>{{ a.status }}
                        </span>
                      </div>
                    </div>

                    <div class="col-sm-6 col-12">
                      <label class="form-label small fw-bold text-muted text-uppercase">Plano</label>
                      <div>
                        <span class="badge border px-3 py-2 rounded-pill fw-semibold bg-primary-subtle text-primary border-primary-subtle">
                          <i class="fas fa-crown me-1"></i>{{ a.clubeNome }}
                        </span>
                        <span class="d-block small text-muted mt-1">R$ {{ a.valor.toFixed(2).replace('.', ',') }}/mês</span>
                      </div>
                    </div>

                    <div class="col-sm-6 col-12">
                      <label class="form-label small fw-bold text-muted text-uppercase">Início da Assinatura</label>
                      <p class="fw-semibold mb-0">{{ formatarData(a.dataInicio) }}</p>
                    </div>

                    <div class="col-sm-6 col-12">
                      <label class="form-label small fw-bold text-muted text-uppercase">Renova em</label>
                      <p class="fw-semibold mb-0">{{ formatarData(a.dataFim) }}</p>
                    </div>

                    <div class="col-12">
                      <div class="border-top pt-3 mt-2">
                        <label class="form-label small fw-bold text-muted text-uppercase">Dias Restantes</label>
                        <h3 class="fw-bold mb-0"
                          [class.text-success]="a.diasRestantes > 7"
                          [class.text-warning]="a.diasRestantes <= 7 && a.diasRestantes > 0"
                          [class.text-danger]="a.diasRestantes <= 0">
                          {{ a.diasRestantes }} dias
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="card border-0 shadow-sm p-4">
                  <h5 class="fw-bold mb-3">
                    <i class="fas fa-file-invoice-dollar me-2 text-primary"></i>Histórico de Pagamentos
                  </h5>
                  <tm-table
                    [cols]="cols()"
                    [data]="pagamentos()"
                    [paginated]="false"
                    [showControls]="false"
                  ></tm-table>
                </div>
              </div>
            </div>
          }
        }
      </div>
      <app-footer></app-footer>
    </div>

    <!-- Templates para a tabela -->
    <ng-template #dataTemplate let-item>
      <span>{{ item.data | date:'dd/MM/yyyy' }}</span>
    </ng-template>

    <ng-template #valorTemplate let-item>
      <span class="fw-semibold">R$ {{ item.valor.toFixed(2).replace('.', ',') }}</span>
    </ng-template>

    <ng-template #statusTemplate let-item>
      <span
        class="badge rounded-pill small fw-semibold border text-nowrap"
        [ngClass]="{
          'bg-success-subtle text-success border-success-subtle': item.status === 'Pago',
          'bg-warning-subtle text-warning border-warning-subtle': item.status === 'Pendente',
          'bg-danger-subtle text-danger border-danger-subtle': item.status === 'Cancelado'
        }"
      >
        {{ item.status }}
      </span>
    </ng-template>
  `,
  styles: [`
    .public-view {
      min-height: 100vh;
      background-color: #f8f9fa;
      display: flex;
      flex-direction: column;
    }
    .public-view > .container {
      flex-grow: 1;
    }
    .avatar-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualizarAssinanteComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly compartilharService = inject(CompartilharService);

  @ViewChild('dataTemplate', { static: true }) dataTemplate!: TemplateRef<{ $implicit: PagamentoVisualizacao }>;
  @ViewChild('valorTemplate', { static: true }) valorTemplate!: TemplateRef<{ $implicit: PagamentoVisualizacao }>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<{ $implicit: PagamentoVisualizacao }>;

  private readonly templatesReady = signal(false);

  protected readonly assinante = signal<AssinantePublico | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly pagamentos = signal<PagamentoVisualizacao[]>([]);

  protected readonly diasLinkRestantes = computed<number | null>(() => {
    const expiresAt = this.assinante()?.expiresAt;
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });

  protected readonly cols = computed<TableColumn<PagamentoVisualizacao>[]>(() => {
    if (!this.templatesReady()) return [];
    return [
      { header: 'Data', template: this.dataTemplate, width: '25%', key: 'data' },
      { header: 'Descrição', key: 'descricao', width: '35%' },
      { header: 'Valor', template: this.valorTemplate, width: '20%', key: 'valor' },
      { header: 'Status', template: this.statusTemplate, width: '20%', key: 'status' },
    ];
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.carregar(token);
    } else {
      this.erro.set('Link inválido.');
      this.carregando.set(false);
    }
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  formatarData(dateStr: string): string {
    if (!dateStr) return '';
    const clean = dateStr.split('T')[0].trim();
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    const slashParts = clean.split('/');
    if (slashParts.length === 3 && slashParts[2].length === 4) {
      return clean;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
  }

  private parseDateOnly(dateStr: string): Date | null {
    if (!dateStr) return null;
    const clean = dateStr.split('T')[0].trim();
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  private carregar(token: string): void {
    this.compartilharService.acessarLink(token).subscribe({
      next: (data) => {
        this.assinante.set(data);
        this.gerarHistoricoPagamentos(data);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Link inválido ou expirado. Solicite um novo link ao seu estabelecimento.');
        this.carregando.set(false);
      },
    });
  }

  private gerarHistoricoPagamentos(a: AssinantePublico): void {
    const dateInicio = this.parseDateOnly(a.dataInicio);
    const dateFim = this.parseDateOnly(a.dataFim);
    if (!dateInicio || !dateFim) return;

    const historico: PagamentoVisualizacao[] = [];
    const hoje = new Date();
    let currentDate = new Date(dateInicio);
    let count = 1;

    while (currentDate <= hoje && currentDate <= dateFim) {
      historico.push({
        id: `p${count}`,
        data: currentDate.toISOString(),
        descricao: 'Renovação Mensal',
        valor: a.valor,
        status: 'Pago',
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
      count++;
    }

    if (a.status === 'Pendente' && historico.length === 0) {
      historico.push({
        id: 'p-pendente',
        data: dateInicio.toISOString(),
        descricao: 'Renovação Mensal',
        valor: a.valor,
        status: 'Pendente',
      });
    }

    historico.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    this.pagamentos.set(historico);
  }
}

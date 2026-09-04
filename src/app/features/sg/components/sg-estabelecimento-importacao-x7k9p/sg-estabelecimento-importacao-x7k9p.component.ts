import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { AuthService } from '../../../../core/services/auth.service';
import {
  ClientesService,
  ImportacaoClienteResult,
} from '../../../../core/services/clientes.service';

@Component({
  selector: 'app-sg-estabelecimento-importacao-x7k9p',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sg-estabelecimento-importacao-x7k9p.component.html',
  styleUrl: './sg-estabelecimento-importacao-x7k9p.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SgEstabelecimentoImportacaoX7k9pComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);
  private readonly clientesService = inject(ClientesService);
  private readonly toastService = inject(TmToastService);

  protected readonly empresaId = signal<string>('');
  protected readonly empresa = signal<any | null>(null);

  protected readonly plataformaSelecionada = signal<'tua-agenda' | null>('tua-agenda');
  protected readonly categoriaSelecionada = signal<'clientes' | null>('clientes');
  protected readonly arquivoSelecionado = signal<File | null>(null);
  protected readonly importando = signal(false);
  protected readonly resultadoImportacao = signal<ImportacaoClienteResult | null>(null);
  protected readonly exibirModalDuplicados = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('empresaId');
    if (id) {
      this.empresaId.set(id);
      this.carregarEmpresa(id);
    } else {
      this.toastService.error('Identificador do estabelecimento inválido.', 'Erro');
      this.router.navigate(['/sg-estabelecimentos-x7k9p']);
    }
  }

  private carregarEmpresa(id: string): void {
    this.authService.getSgEmpresaById(id).subscribe({
      next: (data) => this.empresa.set(data),
      error: () => this.toastService.error('Falha ao carregar informações do estabelecimento.', 'Erro'),
    });
  }

  protected abrirModalDuplicados(): void {
    this.exibirModalDuplicados.set(true);
  }

  protected fecharModalDuplicados(): void {
    this.exibirModalDuplicados.set(false);
  }

  protected selecionarPlataforma(plat: 'tua-agenda' | null): void {
    this.plataformaSelecionada.set(plat);
    this.arquivoSelecionado.set(null);
    this.resultadoImportacao.set(null);
  }

  protected selecionarCategoria(cat: 'clientes' | null): void {
    this.categoriaSelecionada.set(cat);
    this.arquivoSelecionado.set(null);
    this.resultadoImportacao.set(null);
  }

  protected onArquivoCsvSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        this.toastService.error('Selecione um arquivo no formato CSV (.csv).');
        input.value = '';
        return;
      }
      this.arquivoSelecionado.set(file);
      this.resultadoImportacao.set(null);
    }
  }

  protected limparArquivo(): void {
    this.arquivoSelecionado.set(null);
    this.resultadoImportacao.set(null);
  }

  protected async importarCsv(): Promise<void> {
    const file = this.arquivoSelecionado();
    if (!file) {
      this.toastService.error('Selecione um arquivo CSV para importar.');
      return;
    }

    this.importando.set(true);
    try {
      const res = await this.clientesService.importarClientesTuaAgenda(file, this.empresaId());
      this.resultadoImportacao.set(res);
      this.toastService.success(
        `Importação do Tua Agenda concluída para ${this.empresa()?.nomeExibicao || this.empresa()?.nome || 'o estabelecimento'}! ${res.totalCriados} novos clientes cadastrados.`
      );
      if (res.clientesDuplicadosPorCelular && res.clientesDuplicadosPorCelular.length > 0) {
        this.exibirModalDuplicados.set(true);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao processar arquivo CSV do Tua Agenda.';
      this.toastService.error(msg);
    } finally {
      this.importando.set(false);
    }
  }

  protected voltar(): void {
    this.location.back();
  }
}

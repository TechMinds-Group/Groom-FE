import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import {
  ClientesService,
  ImportacaoClienteResult,
} from '../../../../core/services/clientes.service';

@Component({
  selector: 'app-importacao-config',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './importacao-config.component.html',
  styleUrl: './importacao-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportacaoConfigComponent {
  private readonly clientesService = inject(ClientesService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected readonly plataformaSelecionada = signal<'tua-agenda' | null>('tua-agenda');
  protected readonly categoriaSelecionada = signal<'clientes' | null>('clientes');
  protected readonly arquivoSelecionado = signal<File | null>(null);
  protected readonly importando = signal(false);
  protected readonly resultadoImportacao = signal<ImportacaoClienteResult | null>(null);
  protected readonly exibirModalDuplicados = signal(false);

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
        this.toastService.error('Selecione um arquivo de formato CSV (.csv).');
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
      const res = await this.clientesService.importarClientesTuaAgenda(file);
      this.resultadoImportacao.set(res);
      this.toastService.success(
        `Importação do Tua Agenda concluída! ${res.totalCriados} novos clientes cadastrados.`
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

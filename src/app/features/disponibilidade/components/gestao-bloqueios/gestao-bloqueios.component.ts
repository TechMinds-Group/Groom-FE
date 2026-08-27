import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent } from '@techminds-group/tm-angular-lib';
import { BloqueioAgendaDTO, BloqueioAgendaService, FeriadoNacionalImportarDTO } from '../../../../core/services/bloqueio-agenda.service';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';

@Component({
  selector: 'app-gestao-bloqueios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TmTextComponent],
  templateUrl: './gestao-bloqueios.component.html',
  styleUrl: './gestao-bloqueios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestaoBloqueiosComponent implements OnInit {
  private readonly bloqueioService = inject(BloqueioAgendaService);
  private readonly usuarioService = inject(GestaoUsuariosService);
  private readonly fb = inject(FormBuilder);

  readonly bloqueios = signal<BloqueioAgendaDTO[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly importando = signal(false);
  readonly mensagemSucesso = signal<string | null>(null);
  readonly mensagemErro = signal<string | null>(null);

  readonly anoFeriados = signal<number>(new Date().getFullYear());
  readonly feriadosImportacao = signal<FeriadoNacionalImportarDTO[]>([]);
  readonly modalFeriadosAberto = signal(false);
  readonly modalNovoBloqueioAberto = signal(false);

  readonly profissionais = signal<{ id: string; nome: string }[]>([]);

  readonly formNovoBloqueio = this.fb.group({
    profissionalId: [''],
    titulo: ['', [Validators.required]],
    dataInicio: ['', [Validators.required]],
    dataFim: ['', [Validators.required]],
    diaInteiro: [true],
  });

  async ngOnInit(): Promise<void> {
    await this.carregarProfissionais();
    await this.carregarBloqueios();
  }

  private async carregarProfissionais(): Promise<void> {
    try {
      await this.usuarioService.carregarUsuarios();
      const users = this.usuarioService.usuarios();
      this.profissionais.set(users.map((u) => ({ id: u.id, nome: `${u.nome} ${u.sobrenome || ''}`.trim() })));
    } catch {
      // Fallback gracioso
    }
  }

  async carregarBloqueios(): Promise<void> {
    this.carregando.set(true);
    try {
      const hoje = new Date();
      const inicio = new Date(hoje.getFullYear() - 1, 0, 1).toISOString();
      const fim = new Date(hoje.getFullYear() + 1, 11, 31).toISOString();
      const dados = await this.bloqueioService.listarBloqueios(inicio, fim);
      this.bloqueios.set(dados);
    } catch (err) {
      this.mensagemErro.set('Falha ao carregar a lista de bloqueios e feriados.');
    } finally {
      this.carregando.set(false);
    }
  }

  async abrirModalFeriados(): Promise<void> {
    this.modalFeriadosAberto.set(true);
    await this.carregarFeriadosAno(this.anoFeriados());
  }

  fecharModalFeriados(): void {
    this.modalFeriadosAberto.set(false);
  }

  async carregarFeriadosAno(ano: number): Promise<void> {
    this.importando.set(true);
    this.anoFeriados.set(ano);
    try {
      const feriadosApi = await this.bloqueioService.obterFeriadosNacionais(ano);
      this.feriadosImportacao.set(
        feriadosApi.map((f) => ({
          date: f.date,
          name: f.name,
          selecionado: true,
        }))
      );
    } catch {
      this.mensagemErro.set('Falha ao consultar a BrasilAPI de feriados.');
    } finally {
      this.importando.set(false);
    }
  }

  alternarSelecionarTodosFeriados(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.feriadosImportacao.update((lista) => lista.map((item) => ({ ...item, selecionado: checked })));
  }

  async confirmarImportacaoFeriados(): Promise<void> {
    this.importando.set(true);
    this.mensagemErro.set(null);
    try {
      const res = await this.bloqueioService.importarFeriados({
        ano: this.anoFeriados(),
        feriados: this.feriadosImportacao(),
      });
      this.mensagemSucesso.set(`${res.totalImportados} feriado(s) nacional(is) importado(s) com sucesso!`);
      this.fecharModalFeriados();
      await this.carregarBloqueios();
    } catch {
      this.mensagemErro.set('Erro ao importar os feriados selecionados.');
    } finally {
      this.importando.set(false);
    }
  }

  abrirModalNovoBloqueio(): void {
    const hoje = new Date().toISOString().split('T')[0];
    this.formNovoBloqueio.patchValue({
      profissionalId: '',
      titulo: '',
      dataInicio: hoje,
      dataFim: hoje,
      diaInteiro: true,
    });
    this.modalNovoBloqueioAberto.set(true);
  }

  fecharModalNovoBloqueio(): void {
    this.modalNovoBloqueioAberto.set(false);
  }

  async salvarNovoBloqueio(): Promise<void> {
    if (this.formNovoBloqueio.invalid) {
      this.formNovoBloqueio.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.mensagemErro.set(null);

    try {
      const val = this.formNovoBloqueio.value;
      const dataInicioIso = new Date(`${val.dataInicio}T00:00:00`).toISOString();
      const dataFimIso = new Date(`${val.dataFim}T23:59:59`).toISOString();

      await this.bloqueioService.criarBloqueio({
        profissionalId: val.profissionalId || null,
        titulo: val.titulo!,
        dataInicio: dataInicioIso,
        dataFim: dataFimIso,
        diaInteiro: val.diaInteiro ?? true,
        origem: 'manual',
      });

      this.mensagemSucesso.set('Bloqueio/Folga cadastrado com sucesso!');
      this.fecharModalNovoBloqueio();
      await this.carregarBloqueios();
    } catch {
      this.mensagemErro.set('Erro ao criar o bloqueio/folga.');
    } finally {
      this.salvando.set(false);
    }
  }

  async remover(b: BloqueioAgendaDTO): Promise<void> {
    if (!confirm(`Deseja realmente remover o bloqueio "${b.titulo}"?`)) {
      return;
    }

    try {
      await this.bloqueioService.removerBloqueio(b.id);
      this.mensagemSucesso.set('Bloqueio removido com sucesso!');
      await this.carregarBloqueios();
    } catch {
      this.mensagemErro.set('Erro ao remover o bloqueio.');
    }
  }

  formatarDataBr(isoStr: string): string {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleDateString('pt-BR');
  }
}

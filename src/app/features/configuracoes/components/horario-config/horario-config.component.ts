import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TmTimeComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import {
  DiaFuncionamento,
  DIAS_SEMANA_ESTABELECIMENTO,
} from '../../../../core/models/configuracoes/horario-estabelecimento.model';

@Component({
  selector: 'app-horario-config',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TmTimeComponent],
  templateUrl: './horario-config.component.html',
  styleUrl: './horario-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorarioConfigComponent implements OnInit {
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly diasFuncionamento = signal<DiaFuncionamento[]>([]);
  protected readonly diasFuncionamentoOriginal = signal<DiaFuncionamento[]>([]);
  protected readonly salvando = signal(false);
  protected readonly DIAS_SEMANA_LABELS = DIAS_SEMANA_ESTABELECIMENTO;

  protected readonly temAlteracoes = computed(() => {
    const atual = this.diasFuncionamento();
    const orig = this.diasFuncionamentoOriginal();
    if (!orig || orig.length === 0) {
      return false;
    }
    return JSON.stringify(atual) !== JSON.stringify(orig);
  });

  async ngOnInit(): Promise<void> {
    await this.carregarHorarios();
  }

  protected async carregarHorarios(): Promise<void> {
    const data = await this.estabelecimentoService.carregarHorarios();
    this.diasFuncionamento.set(structuredClone(data));
    this.diasFuncionamentoOriginal.set(structuredClone(data));
    this.cdr.markForCheck();
  }

  protected notificarAlteracao(): void {
    this.diasFuncionamento.update((list) => list.map((d) => ({ ...d })));
    this.cdr.markForCheck();
  }

  protected cancelarAlteracoes(): void {
    this.diasFuncionamento.set(structuredClone(this.diasFuncionamentoOriginal()));
    this.cdr.markForCheck();
  }

  protected copiarParaTodos(diaOrigem: DiaFuncionamento): void {
    const lista = this.diasFuncionamento();
    const atualizado = lista.map((d) => ({
      ...d,
      ativo: diaOrigem.ativo,
      horaAbertura: diaOrigem.horaAbertura,
      horaFechamento: diaOrigem.horaFechamento,
      temIntervalo: diaOrigem.temIntervalo,
      intervaloInicio: diaOrigem.intervaloInicio,
      intervaloFim: diaOrigem.intervaloFim,
    }));
    this.diasFuncionamento.set(atualizado);
    this.cdr.markForCheck();
    const nomeDia = DIAS_SEMANA_ESTABELECIMENTO[diaOrigem.diaSemana]?.label;
    this.toastService.success(`Horários de ${nomeDia} copiados para todos os dias!`);
  }

  protected async salvar(): Promise<void> {
    this.salvando.set(true);
    try {
      await this.estabelecimentoService.salvarHorarios(this.diasFuncionamento());
      this.diasFuncionamentoOriginal.set(structuredClone(this.diasFuncionamento()));
      this.toastService.success('Horários salvos com sucesso!');
    } catch {
      this.toastService.error('Erro ao salvar horários. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  protected voltar(): void {
    this.location.back();
  }
}

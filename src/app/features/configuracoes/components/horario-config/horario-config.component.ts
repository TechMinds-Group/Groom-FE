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
  ConfiguracaoHorarioOpcoes,
} from '../../../../core/models/configuracoes/horario-estabelecimento.model';



export interface OpcaoIntervalo {
  val: number;
  label: string;
}

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

  // Aba ativa: 'horarios' | 'configuracoes'
  protected readonly abaAtiva = signal<'horarios' | 'configuracoes'>('horarios');


  // Aba 1: Horários por Dia da Semana
  protected readonly diasFuncionamento = signal<DiaFuncionamento[]>([]);
  protected readonly diasFuncionamentoOriginal = signal<DiaFuncionamento[]>([]);
  protected readonly salvando = signal(false);
  protected readonly DIAS_SEMANA_LABELS = DIAS_SEMANA_ESTABELECIMENTO;

  // Aba 2: Configurações Gerais de Horários
  protected readonly intervaloMinutos = signal<number>(30);
  protected readonly intervaloMinutosOriginal = signal<number>(30);
  /** Valor efetivo (salvo) — controla a aba Horários */
  protected readonly horarioPorDemanda = signal<boolean>(false);
  protected readonly horarioPorDemandaOriginal = signal<boolean>(false);
  /** Valor pendente — editado pelo switch na aba Configurações, aplicado apenas ao salvar */
  protected readonly horarioPorDemandaPendente = signal<boolean>(false);
  protected readonly salvandoOpcoes = signal(false);

  protected readonly opcoesIntervalo: OpcaoIntervalo[] = [
    { val: 15, label: '15 em 15 minutos' },
    { val: 30, label: '30 em 30 minutos (Padrão)' },
    { val: 45, label: '45 em 45 minutos' },
    { val: 60, label: '1h em 1h (60 minutos)' },
  ];

  // Horários Por Demanda (Grade 24h)
  protected readonly horariosDemandaAtivos = signal<Set<string>>(new Set());
  protected readonly horariosDemandaAtivosOriginal = signal<Set<string>>(new Set());

  protected readonly slots24h = computed<string[]>(() => {
    const step = Math.max(15, this.intervaloMinutos() || 30);
    const slots: string[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
      const h = Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0');
      const m = (minutes % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
    return slots;
  });

  protected readonly temAlteracoesDemanda = computed(() => {
    const atual = Array.from(this.horariosDemandaAtivos()).sort();
    const orig = Array.from(this.horariosDemandaAtivosOriginal()).sort();
    return JSON.stringify(atual) !== JSON.stringify(orig);
  });

  protected readonly temAlteracoes = computed(() => {
    if (this.horarioPorDemanda()) {
      return this.temAlteracoesDemanda();
    }
    const atual = this.diasFuncionamento();
    const orig = this.diasFuncionamentoOriginal();
    if (!orig || orig.length === 0) {
      return false;
    }
    return JSON.stringify(atual) !== JSON.stringify(orig);
  });

  protected readonly temAlteracoesOpcoes = computed(() => {
    return (
      this.intervaloMinutos() !== this.intervaloMinutosOriginal() ||
      this.horarioPorDemandaPendente() !== this.horarioPorDemandaOriginal()
    );
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.carregarHorarios(), this.carregarConfiguracoesOpcoes()]);
  }

  protected selecionarAba(aba: 'horarios' | 'configuracoes'): void {
    this.abaAtiva.set(aba);
    this.cdr.markForCheck();
  }


  protected async carregarHorarios(): Promise<void> {
    const data = await this.estabelecimentoService.carregarHorarios();
    this.diasFuncionamento.set(structuredClone(data));
    this.diasFuncionamentoOriginal.set(structuredClone(data));
    this.cdr.markForCheck();
  }

  protected async carregarConfiguracoesOpcoes(): Promise<void> {
    const data = await this.estabelecimentoService.carregarConfiguracoesHorario();
    this.intervaloMinutos.set(data.intervaloAgendamentoMinutos || 30);
    this.intervaloMinutosOriginal.set(data.intervaloAgendamentoMinutos || 30);
    this.horarioPorDemanda.set(!!data.horarioPorDemanda);
    this.horarioPorDemandaOriginal.set(!!data.horarioPorDemanda);
    this.horarioPorDemandaPendente.set(!!data.horarioPorDemanda);

    const demandaLista = data.horariosDemanda || [];
    this.horariosDemandaAtivos.set(new Set(demandaLista));
    this.horariosDemandaAtivosOriginal.set(new Set(demandaLista));
    this.cdr.markForCheck();
  }

  protected notificarAlteracao(): void {
    this.diasFuncionamento.update((list) => list.map((d) => ({ ...d })));
    this.cdr.markForCheck();
  }

  protected toggleSlotDemanda(slot: string): void {
    const conjunto = new Set(this.horariosDemandaAtivos());
    if (conjunto.has(slot)) {
      conjunto.delete(slot);
    } else {
      conjunto.add(slot);
    }
    this.horariosDemandaAtivos.set(conjunto);
    this.cdr.markForCheck();
  }

  protected isSlotDemandaAtivo(slot: string): boolean {
    return this.horariosDemandaAtivos().has(slot);
  }

  protected marcarTodosSlots(): void {
    this.horariosDemandaAtivos.set(new Set(this.slots24h()));
    this.cdr.markForCheck();
  }

  protected desmarcarTodosSlots(): void {
    this.horariosDemandaAtivos.set(new Set());
    this.cdr.markForCheck();
  }

  protected marcarHorarioComercial(): void {
    const comercial = this.slots24h().filter((slot) => {
      const hora = parseInt(slot.split(':')[0], 10);
      return hora >= 8 && hora <= 18;
    });
    this.horariosDemandaAtivos.set(new Set(comercial));
    this.cdr.markForCheck();
  }

  protected cancelarAlteracoes(): void {
    if (this.horarioPorDemanda()) {
      this.horariosDemandaAtivos.set(new Set(this.horariosDemandaAtivosOriginal()));
    } else {
      this.diasFuncionamento.set(structuredClone(this.diasFuncionamentoOriginal()));
    }
    this.cdr.markForCheck();
  }

  protected cancelarAlteracoesOpcoes(): void {
    this.intervaloMinutos.set(this.intervaloMinutosOriginal());
    this.horarioPorDemandaPendente.set(this.horarioPorDemandaOriginal());
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
      if (this.horarioPorDemanda()) {
        const payload: ConfiguracaoHorarioOpcoes = {
          intervaloAgendamentoMinutos: this.intervaloMinutos(),
          horarioPorDemanda: true,
          horariosDemanda: Array.from(this.horariosDemandaAtivos()),
        };
        await this.estabelecimentoService.salvarConfiguracoesHorario(payload);
        this.horariosDemandaAtivosOriginal.set(new Set(this.horariosDemandaAtivos()));
        this.toastService.success('Horários por demanda salvos com sucesso!');
      } else {
        await this.estabelecimentoService.salvarHorarios(this.diasFuncionamento());
        this.diasFuncionamentoOriginal.set(structuredClone(this.diasFuncionamento()));
        this.toastService.success('Horários salvos com sucesso!');
      }
    } catch {
      this.toastService.error('Erro ao salvar horários. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  protected async salvarOpcoes(): Promise<void> {
    this.salvandoOpcoes.set(true);
    try {
      const payload: ConfiguracaoHorarioOpcoes = {
        intervaloAgendamentoMinutos: this.intervaloMinutos(),
        horarioPorDemanda: this.horarioPorDemandaPendente(),
        horariosDemanda: Array.from(this.horariosDemandaAtivos()),
      };
      await this.estabelecimentoService.salvarConfiguracoesHorario(payload);
      this.intervaloMinutosOriginal.set(this.intervaloMinutos());
      // Aplica o valor pendente ao sinal efetivo — a aba Horários muda só aqui
      this.horarioPorDemanda.set(this.horarioPorDemandaPendente());
      this.horarioPorDemandaOriginal.set(this.horarioPorDemandaPendente());
      this.horariosDemandaAtivosOriginal.set(new Set(this.horariosDemandaAtivos()));
      this.toastService.success('Configurações de horários salvas com sucesso!');
    } catch {
      this.toastService.error('Erro ao salvar configurações de horários. Tente novamente.');
    } finally {
      this.salvandoOpcoes.set(false);
    }
  }

  protected voltar(): void {
    this.location.back();
  }
}


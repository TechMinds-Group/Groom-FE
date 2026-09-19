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

import { JornadaEspecialService } from '../../../../core/services/jornada-especial.service';
import { JornadaEspecial } from '../../../../core/models/configuracoes/jornada-especial.model';

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
  private readonly jornadaEspecialService = inject(JornadaEspecialService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);

  // Aba ativa: 'horarios' (dias da semana/24h), 'configuracoes' (regras gerais) ou 'jornadasEspeciais' (jornadas estendidas)
  protected readonly abaAtiva = signal<'horarios' | 'configuracoes' | 'jornadasEspeciais'>('horarios');

  // Aba 3: Jornadas Especiais & Exceções
  protected readonly jornadasEspeciais = signal<JornadaEspecial[]>([]);
  protected readonly carregandoJornadas = signal(false);
  protected readonly modalJornadaAberto = signal(false);
  protected readonly salvandoJornada = signal(false);

  protected readonly formJornada = signal<{
    id?: string;
    titulo: string;
    dataInicio: string;
    dataFim: string;
    horaAbertura: string;
    horaFechamento: string;
    temIntervalo: boolean;
    intervaloInicio: string;
    intervaloFim: string;
  }>({
    titulo: '',
    dataInicio: new Date().toISOString().substring(0, 10),
    dataFim: new Date().toISOString().substring(0, 10),
    horaAbertura: '07:00',
    horaFechamento: '22:00',
    temIntervalo: true,
    intervaloInicio: '12:00',
    intervaloFim: '13:00',
  });

  // Aba 1: Horários por Dia da Semana
  protected readonly diasFuncionamento = signal<DiaFuncionamento[]>([]);
  protected readonly diasFuncionamentoOriginal = signal<DiaFuncionamento[]>([]);
  protected readonly salvando = signal(false);
  protected readonly DIAS_SEMANA_LABELS = DIAS_SEMANA_ESTABELECIMENTO;

  // Aba 2: Configurações Gerais de Horários
  protected readonly intervaloMinutos = signal<number>(30);
  protected readonly intervaloMinutosOriginal = signal<number>(30);
  protected readonly horarioPorDemanda = signal<boolean>(false);
  protected readonly horarioPorDemandaOriginal = signal<boolean>(false);
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
      this.horarioPorDemanda() !== this.horarioPorDemandaOriginal()
    );
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.carregarHorarios(), this.carregarConfiguracoesOpcoes(), this.carregarJornadasEspeciais()]);
  }

  protected selecionarAba(aba: 'horarios' | 'configuracoes' | 'jornadasEspeciais'): void {
    this.abaAtiva.set(aba);
    if (aba === 'jornadasEspeciais') {
      this.carregarJornadasEspeciais();
    }
    this.cdr.markForCheck();
  }

  protected async carregarJornadasEspeciais(): Promise<void> {
    this.carregandoJornadas.set(true);
    try {
      const anoAtual = new Date().getFullYear();
      const inicio = `${anoAtual}-01-01T00:00:00.000Z`;
      const fim = `${anoAtual + 1}-12-31T23:59:59.999Z`;
      const data = await this.jornadaEspecialService.listarJornadas(inicio, fim);
      this.jornadasEspeciais.set(data);
    } catch {
      this.toastService.error('Erro ao carregar jornadas especiais.');
    } finally {
      this.carregandoJornadas.set(false);
      this.cdr.markForCheck();
    }
  }

  protected abrirModalNovaJornada(): void {
    const hoje = new Date().toISOString().substring(0, 10);
    this.formJornada.set({
      titulo: '',
      dataInicio: hoje,
      dataFim: hoje,
      horaAbertura: '07:00',
      horaFechamento: '22:00',
      temIntervalo: true,
      intervaloInicio: '12:00',
      intervaloFim: '13:00',
    });
    this.modalJornadaAberto.set(true);
    this.cdr.markForCheck();
  }

  protected abrirModalEditarJornada(j: JornadaEspecial): void {
    this.formJornada.set({
      id: j.id,
      titulo: j.titulo,
      dataInicio: new Date(j.dataInicio).toISOString().substring(0, 10),
      dataFim: new Date(j.dataFim).toISOString().substring(0, 10),
      horaAbertura: j.horaAbertura || '07:00',
      horaFechamento: j.horaFechamento || '22:00',
      temIntervalo: j.temIntervalo,
      intervaloInicio: j.intervaloInicio || '12:00',
      intervaloFim: j.intervaloFim || '13:00',
    });
    this.modalJornadaAberto.set(true);
    this.cdr.markForCheck();
  }

  protected fecharModalJornada(): void {
    this.modalJornadaAberto.set(false);
    this.cdr.markForCheck();
  }

  protected async salvarJornadaEspecial(): Promise<void> {
    const form = this.formJornada();
    if (!form.titulo || !form.titulo.trim()) {
      this.toastService.warning('Informe o título/motivo da jornada especial.');
      return;
    }

    this.salvandoJornada.set(true);
    try {
      if (form.id) {
        await this.jornadaEspecialService.atualizarJornada({
          id: form.id,
          titulo: form.titulo,
          dataInicio: new Date(`${form.dataInicio}T00:00:00`).toISOString(),
          dataFim: new Date(`${form.dataFim}T23:59:59`).toISOString(),
          horaAbertura: form.horaAbertura,
          horaFechamento: form.horaFechamento,
          temIntervalo: form.temIntervalo,
          intervaloInicio: form.temIntervalo ? form.intervaloInicio : null,
          intervaloFim: form.temIntervalo ? form.intervaloFim : null,
          ativo: true,
        });
        this.toastService.success('Jornada especial atualizada com sucesso!');
      } else {
        await this.jornadaEspecialService.criarJornada({
          titulo: form.titulo,
          dataInicio: new Date(`${form.dataInicio}T00:00:00`).toISOString(),
          dataFim: new Date(`${form.dataFim}T23:59:59`).toISOString(),
          horaAbertura: form.horaAbertura,
          horaFechamento: form.horaFechamento,
          temIntervalo: form.temIntervalo,
          intervaloInicio: form.temIntervalo ? form.intervaloInicio : null,
          intervaloFim: form.temIntervalo ? form.intervaloFim : null,
        });
        this.toastService.success('Jornada especial criada com sucesso!');
      }
      this.fecharModalJornada();
      await this.carregarJornadasEspeciais();
    } catch {
      this.toastService.error('Erro ao salvar jornada especial.');
    } finally {
      this.salvandoJornada.set(false);
      this.cdr.markForCheck();
    }
  }

  protected updateFormJornada(patch: Partial<{
    titulo: string;
    dataInicio: string;
    dataFim: string;
    horaAbertura: string;
    horaFechamento: string;
    temIntervalo: boolean;
    intervaloInicio: string;
    intervaloFim: string;
  }>): void {
    this.formJornada.update((prev) => ({ ...prev, ...patch }));
  }

  protected async excluirJornadaEspecial(id: string): Promise<void> {
    if (!confirm('Deseja realmente excluir esta jornada especial?')) {
      return;
    }
    try {
      await this.jornadaEspecialService.removerJornada(id);
      this.toastService.success('Jornada especial removida!');
      await this.carregarJornadasEspeciais();
    } catch {
      this.toastService.error('Erro ao remover jornada especial.');
    }
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
    this.horarioPorDemanda.set(this.horarioPorDemandaOriginal());
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
        horarioPorDemanda: this.horarioPorDemanda(),
        horariosDemanda: Array.from(this.horariosDemandaAtivos()),
      };
      await this.estabelecimentoService.salvarConfiguracoesHorario(payload);
      this.intervaloMinutosOriginal.set(this.intervaloMinutos());
      this.horarioPorDemandaOriginal.set(this.horarioPorDemanda());
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


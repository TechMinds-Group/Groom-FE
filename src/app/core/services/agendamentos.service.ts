import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Agendamento, agendamentoParaDateLocal } from '../models/agenda.model';
import { HorarioDisponivel } from '../models/agendamento-publico/agendamento-publico.model';

/** DTO de agendamento retornado pela API (camelCase) — exportado para reuso em mapeamentos de outros services. */
export interface AgendamentoApi {
  id: string;
  clienteNome: string;
  clienteTelefone?: string;
  profissionalId: string;
  profissionalNome: string;
  servicoId: string;
  servicoNome: string;
  planoId?: string;
  planoNome?: string;
  tipo?: string;
  preco: number;
  servicoDuracao: number;
  dataInicio: string;
  dataFim: string;
  status: string;
  observacoes?: string;
}

const STATUS_VALIDOS = ['pendente', 'agendado', 'confirmado', 'recusado', 'concluido', 'no-show', 'cancelado', 'nao_compareceu'] as const;
type StatusValido = (typeof STATUS_VALIDOS)[number];

function normalizarStatus(status: string): Agendamento['status'] {
  const statusLower = status?.toLowerCase() ?? '';
  if ((STATUS_VALIDOS as readonly string[]).includes(statusLower)) {
    return statusLower as StatusValido;
  }
  // Fallback para status desconhecido/legado do servidor
  return 'confirmado';
}

/** Mapeia o DTO da API para o modelo de domínio Agendamento (reutilizado por outros services). */
export function mapearAgendamento(api: AgendamentoApi): Agendamento {
  return {
    id: api.id,
    clienteNome: api.clienteNome,
    clienteTelefone: api.clienteTelefone ?? '',
    servicoNome: api.servicoNome,
    profissionalId: api.profissionalId,
    profissionalNome: api.profissionalNome,
    dataInicio: agendamentoParaDateLocal(api.dataInicio),
    dataFim: agendamentoParaDateLocal(api.dataFim),
    status: normalizarStatus(api.status),
    preco: api.preco,
    observacoes: api.observacoes,
    tipo: api.tipo ?? 'servico',
    planoId: api.planoId,
    planoNome: api.planoNome,
  };
}

@Injectable({
  providedIn: 'root',
})
export class AgendamentosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/agendamentos`;

  private readonly _agendamentos = signal<Agendamento[]>([]);
  readonly agendamentos = this._agendamentos.asReadonly();

  async carregarAgendamentos(profissionalId?: string): Promise<void> {
    const params = profissionalId ? `?profissionalId=${profissionalId}` : '';
    const data = await firstValueFrom(
      this.http.get<AgendamentoApi[]>(`${this.apiUrl}${params}`, { withCredentials: true })
    );
    this._agendamentos.set(data.map(mapearAgendamento));
  }

  /** Horários disponíveis de um profissional para a data/serviço (com base na agenda e disponibilidade configurada). */
  async getHorariosDisponiveis(profissionalId: string, data: string, servicoId: string): Promise<HorarioDisponivel[]> {
    const params = `data=${encodeURIComponent(data)}&servicoId=${encodeURIComponent(servicoId)}`;
    return firstValueFrom(
      this.http.get<HorarioDisponivel[]>(`${this.apiUrl}/profissionais/${profissionalId}/horarios?${params}`, { withCredentials: true })
    );
  }

  async criarManual(dados: {
    clienteNome: string;
    clienteTelefone: string;
    profissionalId: string;
    servicoId: string;
    dataInicio: string;
    observacoes?: string;
  }): Promise<Agendamento> {
    const data = await firstValueFrom(
      this.http.post<AgendamentoApi>(this.apiUrl, dados, { withCredentials: true })
    );
    return mapearAgendamento(data);
  }

  async editarManual(
    id: string,
    dados: {
      servicoId?: string;
      dataInicio?: string;
      status: 'confirmado' | 'recusado' | 'nao_compareceu' | 'concluido';
      observacoes?: string;
    }
  ): Promise<Agendamento> {
    const data = await firstValueFrom(
      this.http.put<AgendamentoApi>(`${this.apiUrl}/${id}`, dados, { withCredentials: true })
    );
    return mapearAgendamento(data);
  }

  async cancelar(id: string, motivo?: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiUrl}/${id}/cancelar`, { motivo }, { withCredentials: true })
    );
  }
}

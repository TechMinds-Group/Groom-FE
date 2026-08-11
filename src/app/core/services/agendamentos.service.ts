import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Agendamento } from '../models/agenda.model';

/** DTO de agendamento retornado pela API (camelCase) — exportado para reuso em mapeamentos de outros services. */
export interface AgendamentoApi {
  id: string;
  clienteNome: string;
  clienteTelefone?: string;
  profissionalId: string;
  profissionalNome: string;
  servicoId: string;
  servicoNome: string;
  preco: number;
  servicoDuracao: number;
  dataInicio: string;
  dataFim: string;
  status: string;
  observacoes?: string;
}

const STATUS_VALIDOS = ['pendente', 'confirmado', 'concluido', 'no-show'] as const;
type StatusValido = (typeof STATUS_VALIDOS)[number];

function normalizarStatus(status: string): Agendamento['status'] {
  if ((STATUS_VALIDOS as readonly string[]).includes(status)) {
    return status as StatusValido;
  }
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
    dataInicio: new Date(api.dataInicio),
    dataFim: new Date(api.dataFim),
    status: normalizarStatus(api.status),
    preco: api.preco,
    observacoes: api.observacoes
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
}

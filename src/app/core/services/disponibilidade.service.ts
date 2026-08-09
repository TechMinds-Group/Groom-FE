import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DisponibilidadeProfissional,
  SalvarDisponibilidadeResult,
} from '../models/disponibilidade/disponibilidade.model';
import { AgendamentoApi, mapearAgendamento } from './agendamentos.service';

interface SalvarDisponibilidadeApiResult {
  conflitos: AgendamentoApi[];
}

@Injectable({
  providedIn: 'root',
})
export class DisponibilidadeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/disponibilidade`;

  private readonly _disponibilidade = signal<DisponibilidadeProfissional | null>(null);
  readonly disponibilidade = this._disponibilidade.asReadonly();

  /** Busca a disponibilidade atual do profissional. Requer perfil de Profissional ou Administrador. */
  async getDisponibilidade(profissionalId: string): Promise<DisponibilidadeProfissional> {
    const data = await firstValueFrom(
      this.http.get<DisponibilidadeProfissional>(`${this.apiUrl}/${profissionalId}`, {
        withCredentials: true,
      })
    );
    this._disponibilidade.set(data);
    return data;
  }

  /** Salva o estado completo da disponibilidade (replace-all). Conflitos não bloqueiam o save. */
  async salvarDisponibilidade(
    profissionalId: string,
    dados: DisponibilidadeProfissional
  ): Promise<SalvarDisponibilidadeResult> {
    const data = await firstValueFrom(
      this.http.put<SalvarDisponibilidadeApiResult>(`${this.apiUrl}/${profissionalId}`, dados, {
        withCredentials: true,
      })
    );
    return { conflitos: data.conflitos.map(mapearAgendamento) };
  }
}

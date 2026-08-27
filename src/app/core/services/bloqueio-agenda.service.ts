import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BloqueioAgendaDTO {
  id: string;
  profissionalId?: string;
  nomeProfissional?: string;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  diaInteiro: boolean;
  origem: string;
  createdAtUtc: string;
}

export interface FeriadoNacionalDTO {
  date: string;
  name: string;
  type: string;
}

export interface CriarBloqueioCommand {
  profissionalId?: string | null;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  diaInteiro: boolean;
  origem?: string;
}

export interface FeriadoNacionalImportarDTO {
  date: string;
  name: string;
  selecionado: boolean;
}

export interface ImportarFeriadosCommand {
  ano: number;
  feriados: FeriadoNacionalImportarDTO[];
}

@Injectable({
  providedIn: 'root',
})
export class BloqueioAgendaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/bloqueios-agenda`;

  async listarBloqueios(inicio: string, fim: string, profissionalId?: string): Promise<BloqueioAgendaDTO[]> {
    let url = `${this.baseUrl}?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;
    if (profissionalId) {
      url += `&profissionalId=${encodeURIComponent(profissionalId)}`;
    }
    return firstValueFrom(this.http.get<BloqueioAgendaDTO[]>(url, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async criarBloqueio(command: CriarBloqueioCommand): Promise<BloqueioAgendaDTO> {
    return firstValueFrom(this.http.post<BloqueioAgendaDTO>(this.baseUrl, command, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async removerBloqueio(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async obterFeriadosNacionais(ano: number): Promise<FeriadoNacionalDTO[]> {
    return firstValueFrom(this.http.get<FeriadoNacionalDTO[]>(`${this.baseUrl}/feriados-nacionais/${ano}`, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async importarFeriados(command: ImportarFeriadosCommand): Promise<{ totalImportados: number }> {
    return firstValueFrom(this.http.post<{ totalImportados: number }>(`${this.baseUrl}/importar-feriados`, command, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }
}

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  JornadaEspecial,
  CriarJornadaEspecialCommand,
  AtualizarJornadaEspecialCommand,
} from '../models/configuracoes/jornada-especial.model';

@Injectable({
  providedIn: 'root',
})
export class JornadaEspecialService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/jornadas-especiais`;

  async listarJornadas(inicio: string, fim: string, profissionalId?: string): Promise<JornadaEspecial[]> {
    let params = new HttpParams().set('inicio', inicio).set('fim', fim);
    if (profissionalId) {
      params = params.set('profissionalId', profissionalId);
    }
    return firstValueFrom(this.http.get<JornadaEspecial[]>(this.apiUrl, { params }));
  }

  async criarJornada(command: CriarJornadaEspecialCommand): Promise<JornadaEspecial> {
    return firstValueFrom(this.http.post<JornadaEspecial>(this.apiUrl, command));
  }

  async atualizarJornada(command: AtualizarJornadaEspecialCommand): Promise<JornadaEspecial> {
    return firstValueFrom(this.http.put<JornadaEspecial>(`${this.apiUrl}/${command.id}`, command));
  }

  async removerJornada(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
  }
}

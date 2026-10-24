import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Configuração de Aniversariantes do estabelecimento (menu Configurações › Aniversariantes — CR-004). */
export interface AniversarioConfigDTO {
  mensagem: string | null;
  /** 0 = sem desconto (apenas a mensagem de parabéns). */
  percentualDescontoPadrao: number;
  validadeDiasPadrao: number | null;
  envioAutomatico: boolean;
  coletaDataNascimento: boolean;
  whatsappConectado: boolean;
}

export interface SalvarAniversarioConfigCommand {
  mensagem: string | null;
  percentualDescontoPadrao: number;
  validadeDiasPadrao: number | null;
  envioAutomatico: boolean;
  coletaDataNascimento: boolean;
}

/** Cupom de aniversário do cliente no ano (status do card e do menu). */
export interface CupomAniversarioDTO {
  cupomId: string;
  codigo: string;
  percentualDesconto: number;
  validadeDias: number;
  expiraEmUtc: string;
  status: string;
}

/** Linha da lista de aniversariantes (menu e widget do dashboard). */
export interface AniversarianteItemDTO {
  clienteId: string;
  nome: string;
  celular: string | null;
  /** Data completa (ISO YYYY-MM-DD). */
  dataNascimento: string | null;
  /** Dia/mês celebrado formatado "dd/MM". */
  diaMes: string;
  temWhatsapp: boolean;
  auto: boolean;
  enviado: boolean;
  cupom: CupomAniversarioDTO | null;
}

export interface EnviarParabensResultDTO {
  cupomId: string | null;
  codigo: string | null;
  percentualDesconto: number;
  validadeDias: number | null;
  expiraEmUtc: string | null;
  status: string;
}

export interface EnviarTodosResultDTO {
  marcados: number;
  puladosComCupom: number;
}

export interface ResumoAniversariantesDTO {
  enviados: number;
  usados: number;
}

export type JanelaAniversariantes = 'hoje' | '7dias' | 'mes';

@Injectable({
  providedIn: 'root',
})
export class AniversariantesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/aniversariantes`;

  async obterConfig(): Promise<AniversarioConfigDTO> {
    return firstValueFrom(this.http.get<AniversarioConfigDTO>(`${this.baseUrl}/config`, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async salvarConfig(command: SalvarAniversarioConfigCommand): Promise<AniversarioConfigDTO> {
    return firstValueFrom(this.http.put<AniversarioConfigDTO>(`${this.baseUrl}/config`, command, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async listar(janela: JanelaAniversariantes = 'hoje', mes?: number, busca?: string): Promise<AniversarianteItemDTO[]> {
    const params = new URLSearchParams({ janela });
    if (janela === 'mes' && mes) {
      params.set('mes', String(mes));
    }
    if (busca && busca.trim()) {
      params.set('busca', busca.trim());
    }

    return firstValueFrom(this.http.get<AniversarianteItemDTO[]>(`${this.baseUrl}?${params.toString()}`, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async alternarAuto(clienteId: string, auto: boolean): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.baseUrl}/${clienteId}/auto`, { auto }, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async enviarParabens(clienteId: string): Promise<EnviarParabensResultDTO> {
    return firstValueFrom(this.http.post<EnviarParabensResultDTO>(`${this.baseUrl}/${clienteId}/parabens`, {}, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async enviarTodos(): Promise<EnviarTodosResultDTO> {
    return firstValueFrom(this.http.post<EnviarTodosResultDTO>(`${this.baseUrl}/enviar-todos`, {}, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }

  async obterResumo(): Promise<ResumoAniversariantesDTO> {
    return firstValueFrom(this.http.get<ResumoAniversariantesDTO>(`${this.baseUrl}/resumo`, { withCredentials: true, headers: { 'X-Skip-Error-Toast': 'true' } }));
  }
}

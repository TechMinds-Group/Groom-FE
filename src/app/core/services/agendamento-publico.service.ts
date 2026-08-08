import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgendamentoPublico,
  CriarAgendamentoPayload,
  HorarioDisponivel,
  LoginClienteResult,
  ProfissionalDisponivel,
  ServicoDisponivel,
} from '../models/agendamento-publico/agendamento-publico.model';

const CLIENTE_TOKEN_KEY = 'groom_cliente_token';

@Injectable({
  providedIn: 'root',
})
export class AgendamentoPublicoService {
  private readonly http = inject(HttpClient);

  private readonly _estabelecimento = signal<string | null>(null);
  readonly estabelecimento = this._estabelecimento.asReadonly();

  /** Define o estabelecimento (tenant) ativo, normalizado em maiúsculas e sem espaços. */
  setEstabelecimento(estabelecimento: string): void {
    this._estabelecimento.set(estabelecimento.trim().toUpperCase());
  }

  getToken(): string | null {
    return localStorage.getItem(CLIENTE_TOKEN_KEY);
  }

  salvarToken(token: string): void {
    localStorage.setItem(CLIENTE_TOKEN_KEY, token);
  }

  limparToken(): void {
    localStorage.removeItem(CLIENTE_TOKEN_KEY);
  }

  private get baseUrl(): string {
    const estabelecimento = this._estabelecimento() ?? '';
    return `${environment.apiUrl}/api/publico/${estabelecimento}/agendamento`;
  }

  async cadastro(dados: { nome: string; email: string; senha: string; celular?: string }): Promise<LoginClienteResult> {
    return firstValueFrom(this.http.post<LoginClienteResult>(`${this.baseUrl}/cadastro`, dados));
  }

  async login(dados: { email: string; senha: string }): Promise<LoginClienteResult> {
    return firstValueFrom(this.http.post<LoginClienteResult>(`${this.baseUrl}/login`, dados));
  }

  async loginGoogle(idToken: string): Promise<LoginClienteResult> {
    return firstValueFrom(this.http.post<LoginClienteResult>(`${this.baseUrl}/login/google`, { idToken }));
  }

  async getProfissionais(): Promise<ProfissionalDisponivel[]> {
    return firstValueFrom(this.http.get<ProfissionalDisponivel[]>(`${this.baseUrl}/profissionais`));
  }

  async getServicosProfissional(profissionalId: string): Promise<ServicoDisponivel[]> {
    return firstValueFrom(this.http.get<ServicoDisponivel[]>(`${this.baseUrl}/profissionais/${profissionalId}/servicos`));
  }

  async getHorarios(profissionalId: string, data: string, servicoId: string): Promise<HorarioDisponivel[]> {
    const params = `data=${encodeURIComponent(data)}&servicoId=${encodeURIComponent(servicoId)}`;
    return firstValueFrom(this.http.get<HorarioDisponivel[]>(`${this.baseUrl}/profissionais/${profissionalId}/horarios?${params}`));
  }

  async criarAgendamento(dados: CriarAgendamentoPayload): Promise<AgendamentoPublico> {
    const token = this.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(this.http.post<AgendamentoPublico>(this.baseUrl, dados, { headers }));
  }
}

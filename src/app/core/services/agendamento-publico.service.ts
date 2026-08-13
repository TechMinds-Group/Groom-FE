import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgendamentoPublico,
  CriarAgendamentoPayload,
  DiaDisponivelPublico,
  HorarioDisponivel,
  LoginClienteResult,
  ProfissionalDisponivel,
  ServicoDisponivel,
} from '../models/agendamento-publico/agendamento-publico.model';

@Injectable({
  providedIn: 'root',
})
export class AgendamentoPublicoService {
  private readonly http = inject(HttpClient);

  private readonly _estabelecimento = signal<string | null>(null);
  readonly estabelecimento = this._estabelecimento.asReadonly();
  private readonly _clienteLogado = signal<{ id: string; nome: string; email: string; celular?: string } | null>(null);
  readonly clienteLogado = this._clienteLogado.asReadonly();

  setEstabelecimento(estabelecimento: string): void {
    this._estabelecimento.set(estabelecimento.trim().toUpperCase());
  }

  private get baseUrl(): string {
    const estabelecimento = this._estabelecimento() ?? '';
    return `${environment.apiUrl}/api/publico/${estabelecimento}/agendamento`;
  }

  async cadastro(dados: { nome: string; email: string; senha: string; celular?: string }, rememberMe = false): Promise<LoginClienteResult> {
    const result = await firstValueFrom(
      this.http.post<LoginClienteResult>(`${this.baseUrl}/cadastro?rememberMe=${rememberMe}`, dados, { withCredentials: true })
    );
    this._clienteLogado.set({ id: result.cliente.id, nome: result.cliente.nome, email: result.cliente.email, celular: result.cliente.celular });
    return result;
  }

  async login(dados: { email: string; senha: string }, rememberMe = false): Promise<LoginClienteResult> {
    const result = await firstValueFrom(
      this.http.post<LoginClienteResult>(`${this.baseUrl}/login?rememberMe=${rememberMe}`, dados, { withCredentials: true })
    );
    this._clienteLogado.set({ id: result.cliente.id, nome: result.cliente.nome, email: result.cliente.email, celular: result.cliente.celular });
    return result;
  }

  async loginGoogle(idToken: string, rememberMe = false): Promise<LoginClienteResult> {
    const result = await firstValueFrom(
      this.http.post<LoginClienteResult>(`${this.baseUrl}/login/google?rememberMe=${rememberMe}`, { idToken }, { withCredentials: true })
    );
    this._clienteLogado.set({ id: result.cliente.id, nome: result.cliente.nome, email: result.cliente.email, celular: result.cliente.celular });
    return result;
  }

  async getMe(): Promise<{ id: string; nome: string; email: string; celular?: string } | null> {
    try {
      const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
      const data = await firstValueFrom(
        this.http.get<{ id: string; nome: string; email: string; celular?: string }>(`${this.baseUrl}/me`, {
          withCredentials: true,
          headers,
        })
      );
      this._clienteLogado.set(data);
      return data;
    } catch {
      this._clienteLogado.set(null);
      return null;
    }
  }

  async atualizarCelular(celular: string): Promise<void> {
    await firstValueFrom(
      this.http.put<void>(`${this.baseUrl}/me/celular`, { celular }, { withCredentials: true })
    );
    const atual = this._clienteLogado();
    if (atual) {
      this._clienteLogado.set({ ...atual, celular });
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true })
      );
    } finally {
      this._clienteLogado.set(null);
    }
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

  async getDisponibilidadeSemanal(profissionalId: string): Promise<DiaDisponivelPublico[]> {
    return firstValueFrom(this.http.get<DiaDisponivelPublico[]>(`${this.baseUrl}/profissionais/${profissionalId}/disponibilidade`));
  }

  async criarAgendamento(dados: CriarAgendamentoPayload): Promise<AgendamentoPublico> {
    return firstValueFrom(
      this.http.post<AgendamentoPublico>(this.baseUrl, dados, { withCredentials: true })
    );
  }
}
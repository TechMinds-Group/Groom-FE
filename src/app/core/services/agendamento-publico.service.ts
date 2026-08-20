import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AgendamentoPublico,
  ClienteAgendamento,
  CriarAgendamentoPayload,
  CriarAgendamentoPlanoPayload,
  DiaDisponivelPublico,
  HorarioDisponivel,
  LoginClienteResult,
  PlanoAtivoCliente,
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

  /** Registra o cliente logado quando a resposta contém dados de cliente autenticado. */
  private registrarClienteLogado(result: LoginClienteResult): void {
    this._clienteLogado.set({ id: result.cliente.id, nome: result.cliente.nome, email: result.cliente.email, celular: result.cliente.celular });
  }

  async cadastro(dados: { nome: string; email: string; senha: string; celular?: string }, rememberMe = false): Promise<LoginClienteResult> {
    const result = await firstValueFrom(
      this.http.post<LoginClienteResult>(`${this.baseUrl}/cadastro?rememberMe=${rememberMe}`, dados, { withCredentials: true })
    );
    this.registrarClienteLogado(result);
    return result;
  }

  async login(dados: { email: string; senha: string }, rememberMe = false): Promise<LoginClienteResult> {
    const result = await firstValueFrom(
      this.http.post<LoginClienteResult>(`${this.baseUrl}/login?rememberMe=${rememberMe}`, dados, { withCredentials: true })
    );
    this.registrarClienteLogado(result);
    return result;
  }

  async loginGoogle(idToken: string, rememberMe = false): Promise<LoginClienteResult> {
    const result = await firstValueFrom(
      this.http.post<LoginClienteResult>(`${this.baseUrl}/login/google?rememberMe=${rememberMe}`, { idToken }, { withCredentials: true })
    );
    this.registrarClienteLogado(result);
    return result;
  }

  /** Finaliza o cadastro do cliente (nome completo, e-mail e celular) — usado na tela de finalização de cadastro. */
  async atualizarDadosCadastro(dados: { nome: string; email: string; celular: string }): Promise<ClienteAgendamento> {
    // Erros de validação são exibidos na própria tela de finalização de cadastro
    const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
    const cliente = await firstValueFrom(
      this.http.put<ClienteAgendamento>(`${this.baseUrl}/me`, dados, { withCredentials: true, headers })
    );
    this._clienteLogado.set({ id: cliente.id, nome: cliente.nome, email: cliente.email, celular: cliente.celular });
    return cliente;
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
    // Erros de negócio são tratados no componente (inclui a tela de finalização de cadastro)
    const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
    return firstValueFrom(
      this.http.post<AgendamentoPublico>(this.baseUrl, dados, { withCredentials: true, headers })
    );
  }

  /** Retorna o plano com assinatura ativa do cliente logado, ou null quando não há assinatura. */
  async getMeuPlano(): Promise<PlanoAtivoCliente | null> {
    try {
      const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
      return await firstValueFrom(
        this.http.get<PlanoAtivoCliente>(`${this.baseUrl}/meu-plano`, { withCredentials: true, headers })
      );
    } catch {
      return null;
    }
  }

  /** Retorna todos os planos com assinatura ativa do cliente logado. */
  async getMeusPlanos(): Promise<PlanoAtivoCliente[]> {
    try {
      const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
      return await firstValueFrom(
        this.http.get<PlanoAtivoCliente[]>(`${this.baseUrl}/meus-planos`, { withCredentials: true, headers })
      );
    } catch {
      const unico = await this.getMeuPlano();
      return unico ? [unico] : [];
    }
  }

  async getProfissionaisPlano(planoId: string): Promise<ProfissionalDisponivel[]> {
    return firstValueFrom(this.http.get<ProfissionalDisponivel[]>(`${this.baseUrl}/planos/${planoId}/profissionais`));
  }

  async getHorariosPlano(planoId: string, profissionalId: string, data: string): Promise<HorarioDisponivel[]> {
    const params = `profissionalId=${encodeURIComponent(profissionalId)}&data=${encodeURIComponent(data)}`;
    return firstValueFrom(
      this.http.get<HorarioDisponivel[]>(`${this.baseUrl}/planos/${planoId}/horarios?${params}`)
    );
  }

  async criarAgendamentoPlano(dados: CriarAgendamentoPlanoPayload): Promise<AgendamentoPublico> {
    const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
    return firstValueFrom(
      this.http.post<AgendamentoPublico>(`${this.baseUrl}/plano`, dados, { withCredentials: true, headers })
    );
  }
}
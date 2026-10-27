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

/** Cupom de aniversário validado com sucesso (RN-080/CR-004). */
export interface CupomAniversarioValido {
  cupomAniversarioId: string;
  codigo: string;
  percentualDesconto: number;
  validadeDias: number;
  expiraEmUtc: string;
}

/** Linha de "Meus agendamentos" do portal (ativos e histórico — CR-004). */
export interface MeuAgendamentoItem {
  id: string;
  profissionalId: string;
  servicoId?: string | null;
  planoId?: string | null;
  servicoDuracao: number;
  profissionalNome: string;
  servicoNome: string;
  servicoPreco: number;
  dataInicio: string;
  dataFim: string;
  status: string;
  tipo: string;
  planoNome?: string;
  cupomAniversarioCodigo?: string | null;
  cupomAniversarioPercentual?: number | null;
  /** CR-004 — true quando ainda pode cancelar/remarcar (antecedência configurada). */
  podeAlterar: boolean;
  /** CR-004 — mensagem do prazo quando não pode mais alterar. */
  mensagemPrazo?: string | null;
}

export interface MeusAgendamentosResponse {
  itens: MeuAgendamentoItem[];
  total: number;
  pagina: number;
  tamanhoPagina: number;
}

@Injectable({
  providedIn: 'root',
})
export class AgendamentoPublicoService {
  private readonly http = inject(HttpClient);

  private readonly _estabelecimento = signal<string | null>(null);
  readonly estabelecimento = this._estabelecimento.asReadonly();
  private readonly _clienteLogado = signal<{ id: string; nome: string; email: string; celular?: string; dataNascimento?: string | null } | null>(null);
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
    this._clienteLogado.set({
      id: result.cliente.id,
      nome: result.cliente.nome,
      email: result.cliente.email,
      celular: result.cliente.celular,
      dataNascimento: result.cliente.dataNascimento ?? null,
    });
  }

  async cadastro(
    dados: { nome: string; email: string; senha: string; celular?: string; codigoPais?: string; dataNascimento?: string },
    rememberMe = false,
  ): Promise<LoginClienteResult> {
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
  async atualizarDadosCadastro(dados: { nome: string; email: string; celular: string; codigoPais?: string; dataNascimento?: string }): Promise<ClienteAgendamento> {
    // Erros de validação são exibidos na própria tela de finalização de cadastro
    const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
    const cliente = await firstValueFrom(
      this.http.put<ClienteAgendamento>(`${this.baseUrl}/me`, dados, { withCredentials: true, headers })
    );
    this._clienteLogado.set({ id: cliente.id, nome: cliente.nome, email: cliente.email, celular: cliente.celular });
    return cliente;
  }

  async getMe(): Promise<{ id: string; nome: string; email: string; celular?: string; dataNascimento?: string | null } | null> {
    try {
      const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
      const data = await firstValueFrom(
        this.http.get<{ id: string; nome: string; email: string; celular?: string; dataNascimento?: string | null }>(`${this.baseUrl}/me`, {
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

  /** RN-074 — atualiza o celular do cliente (canônico no backend; codigoPais default 55). */
  async atualizarCelular(celular: string, codigoPais?: string): Promise<void> {
    await firstValueFrom(
      this.http.put<void>(`${this.baseUrl}/me/celular`, { celular, codigoPais }, { withCredentials: true })
    );
    const atual = this._clienteLogado();
    if (atual) {
      this._clienteLogado.set({ ...atual, celular });
    }
  }

  /**
   * RN-028/074 — restaura a sessão do cliente via POST refresh-session: com o JWT ainda
   * válido renova o cookie (sliding); com o ClienteRefresh ("Manter conectado" — 14 dias)
   * reemite o JWT. Sem cookies responde 401 — o chamador decide o fluxo.
   */
  async restaurarSessao(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/refresh-session`, {}, {
          withCredentials: true,
          headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' }),
        }),
      );
    } catch {
      // sem sessão (nenhum cookie válido) — nada a restaurar
    }
  }

  async logout(): Promise<void> {    try {
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

  // ─── CR-004 — Meus agendamentos do portal (ativos, histórico, cancelar, remarcar) ───

  /** Lista os agendamentos da conta logada: janela "ativos" (futuros) ou "historico" (paginado). */
  async listarMeusAgendamentos(janela: 'ativos' | 'historico', pagina = 1, tamanho = 10): Promise<MeusAgendamentosResponse> {
    const params = new URLSearchParams({ janela, pagina: String(pagina), tamanho: String(tamanho) });
    return firstValueFrom(
      this.http.get<MeusAgendamentosResponse>(`${this.baseUrl}/me/agendamentos?${params.toString()}`, { withCredentials: true }),
    );
  }

  /** Cancela um agendamento ativo futuro da conta logada. */
  async cancelarMeuAgendamento(agendamentoId: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.baseUrl}/me/agendamentos/${agendamentoId}/cancelar`, {}, { withCredentials: true }),
    );
  }

  /** Remarca um agendamento ativo futuro da conta logada para nova data/hora (ISO local sem fuso). */
  async remarcarMeuAgendamento(agendamentoId: string, dataInicio: string): Promise<MeuAgendamentoItem> {
    const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
    return firstValueFrom(
      this.http.post<MeuAgendamentoItem>(
        `${this.baseUrl}/me/agendamentos/${agendamentoId}/remarcar`,
        { dataInicio },
        { withCredentials: true, headers },
      ),
    );
  }

  /**
   * RN-080 (CR-004) — valida o código do cupom de aniversário pelo portal (cliente
   * autenticado via cookie; rate limit no backend). Erros de negócio tratados no chamador.
   */
  async validarCupomAniversario(codigo: string): Promise<CupomAniversarioValido> {
    const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
    return firstValueFrom(
      this.http.post<CupomAniversarioValido>(
        `${environment.apiUrl}/api/aniversariantes/cupons/validar`,
        { codigo },
        { withCredentials: true, headers },
      )
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
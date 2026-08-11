import { Injectable, signal, computed, Signal, inject } from '@angular/core';
import { Agendamento } from '../../../core/models/agenda.model';
import { UserContext } from '../../../core/services/auth.service';
import { AgendamentosService } from '../../../core/services/agendamentos.service';

@Injectable({
  providedIn: 'root'
})
export class AgendaService {
  private readonly agendamentosService = inject(AgendamentosService);
  private _agendamentos = signal<Agendamento[]>([]);

  // Expondo o sinal como readonly para seguir boas práticas de Signal-based state management
  public agendamentos = computed(() => this._agendamentos());

  constructor() { }

  /**
   * Carrega os agendamentos reais da API. Requer perfil de Administrador ou Profissional.
   * Quando profissionalId é informado, busca apenas os agendamentos daquele profissional.
   */
  async carregarAgendamentos(profissionalId?: string): Promise<void> {
    await this.agendamentosService.carregarAgendamentos(profissionalId);
    this._agendamentos.set(this.agendamentosService.agendamentos());
  }

  /**
   * Filtra os agendamentos conforme o perfil multi-nível do usuário logado:
   * Admin (em qualquer nível) vê todos; profissional sem nível Admin vê apenas os próprios.
   */
  getAgendamentosFiltrados(usuarioLogado: UserContext | null): Signal<Agendamento[]> {
    return computed(() => {
      const todos = this._agendamentos();
      const hasAdmin = usuarioLogado?.roles?.includes('Administrador') ?? false;
      if (hasAdmin || !usuarioLogado) {
        return todos;
      }
      return todos.filter(a => a.profissionalId === usuarioLogado.id);
    });
  }

  addAgendamento(novo: Agendamento) {
    this._agendamentos.update(atual => [...atual, novo]);
  }

  updateStatus(id: string, status: Agendamento['status']) {
    this._agendamentos.update(atual => 
      atual.map(a => a.id === id ? { ...a, status } : a)
    );
  }

  updateAgendamento(agendamento: Agendamento) {
    this._agendamentos.update(atual => 
      atual.map(a => a.id === agendamento.id ? agendamento : a)
    );
  }

  removeAgendamento(id: string) {
    this._agendamentos.update(atual => atual.filter(a => a.id !== id));
  }
}

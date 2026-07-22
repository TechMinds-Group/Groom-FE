import { Injectable, signal, computed } from '@angular/core';
import { Agendamento } from '../../../core/models/agenda.model';
import { addHours, startOfDay, addDays } from 'date-fns';

@Injectable({
  providedIn: 'root'
})
export class AgendaService {
  private _agendamentos = signal<Agendamento[]>([
    {
      id: '1',
      clienteNome: 'Michel Gomes',
      clienteTelefone: '11999999999',
      servicoNome: 'Corte de Cabelo Premium',
      profissionalNome: 'Alexandre',
      dataInicio: addHours(startOfDay(new Date()), 9),
      dataFim: addHours(startOfDay(new Date()), 10),
      status: 'confirmado',
      preco: 100,
      corPrimaria: '#0d6efd'
    },
    {
      id: '2',
      clienteNome: 'João Silva',
      clienteTelefone: '11888888888',
      servicoNome: 'Barba Completa',
      profissionalNome: 'Mariana',
      dataInicio: addHours(startOfDay(new Date()), 11),
      dataFim: addHours(startOfDay(new Date()), 11.5),
      status: 'pendente',
      preco: 60,
      corPrimaria: '#dc3545'
    },
    {
      id: '3',
      clienteNome: 'Ana Souza',
      clienteTelefone: '11777777777',
      servicoNome: 'Grooming Completo',
      profissionalNome: 'Alexandre',
      dataInicio: addHours(startOfDay(addDays(new Date(), 1)), 14),
      dataFim: addHours(startOfDay(addDays(new Date(), 1)), 16),
      status: 'confirmado',
      preco: 250,
      corPrimaria: '#198754'
    },
    {
      id: '4',
      clienteNome: 'Luizinho (Kids)',
      clienteTelefone: '11666666666',
      servicoNome: 'Corte Kids',
      profissionalNome: 'Mariana',
      dataInicio: addHours(startOfDay(new Date()), 14),
      dataFim: addHours(startOfDay(new Date()), 14.75),
      status: 'confirmado',
      preco: 80,
      corPrimaria: '#6f42c1'
    },
    {
      id: '5',
      clienteNome: 'Fernanda Lima',
      clienteTelefone: '11555555555',
      servicoNome: 'Tintura',
      profissionalNome: 'Roberto',
      dataInicio: addHours(startOfDay(new Date()), 16),
      dataFim: addHours(startOfDay(new Date()), 17.5),
      status: 'confirmado',
      preco: 150,
      corPrimaria: '#fd7e14'
    }
  ]);

  // Expondo o sinal como readonly para seguir boas práticas de Signal-based state management
  public agendamentos = computed(() => this._agendamentos());

  constructor() { }

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

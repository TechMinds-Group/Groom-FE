export interface ClienteAgendamento {
  id: string;
  nome: string;
  email: string;
  celular?: string;
  loginGoogle: boolean;
}

export interface LoginClienteResult {
  token: string;
  cliente: ClienteAgendamento;
}

export interface ProfissionalDisponivel {
  id: string;
  nome: string;
}

export interface ServicoDisponivel {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
}

export interface HorarioDisponivel {
  hora: string;
  disponivel: boolean;
}

export interface IntervaloDisponivelPublico {
  horaInicio: string;
  horaFim: string;
}

/** Dia da semana configurado pelo profissional (0 = Domingo ... 6 = Sábado). */
export interface DiaDisponivelPublico {
  diaSemana: number;
  trabalhaHoje: boolean;
  intervalos: IntervaloDisponivelPublico[];
}

export interface CriarAgendamentoPayload {
  profissionalId: string;
  servicoId: string;
  dataInicio: string;
  observacoes?: string;
}

export interface AgendamentoPublico {
  id: string;
  clienteId: string;
  profissionalId: string;
  profissionalNome: string;
  servicoId: string;
  servicoNome: string;
  servicoPreco: number;
  servicoDuracao: number;
  dataInicio: Date;
  dataFim: Date;
  status: 'confirmado' | 'cancelado' | 'concluido';
}

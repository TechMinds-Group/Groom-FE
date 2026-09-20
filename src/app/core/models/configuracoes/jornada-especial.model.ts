export interface JornadaEspecial {
  id: string;
  profissionalId?: string | null;
  nomeProfissional?: string | null;
  titulo: string;
  dataInicio: string; // ISO string
  dataFim: string; // ISO string
  horaAbertura: string; // HH:mm
  horaFechamento: string; // HH:mm
  temIntervalo: boolean;
  intervaloInicio?: string | null; // HH:mm
  intervaloFim?: string | null; // HH:mm
  ativo: boolean;
  createdAtUtc?: string;
}

export interface CriarJornadaEspecialCommand {
  profissionalId?: string | null;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  horaAbertura: string;
  horaFechamento: string;
  temIntervalo: boolean;
  intervaloInicio?: string | null;
  intervaloFim?: string | null;
}

export interface AtualizarJornadaEspecialCommand {
  id: string;
  profissionalId?: string | null;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  horaAbertura: string;
  horaFechamento: string;
  temIntervalo: boolean;
  intervaloInicio?: string | null;
  intervaloFim?: string | null;
  ativo: boolean;
}

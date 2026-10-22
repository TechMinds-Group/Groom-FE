import { Injectable, inject } from '@angular/core';
import { AgendamentoPublicoService } from '../../../core/services/agendamento-publico.service';
import { ListaEsperaService } from '../../../core/services/lista-espera.service';
import { ListaEsperaReserva } from '../../../core/models/lista-espera/lista-espera.model';

/** Ids exigidos pelo POST do portal — o DTO da reserva traz apenas nomes. */
export interface IdsDaReserva {
  profissionalId: string;
  servicoId: string;
}

/** Corpo de erro do backend { code, description } — camelCase ou PascalCase. */
export interface ErroApi {
  code?: string;
  Code?: string;
  description?: string;
  Description?: string;
}

/** Extrai o código de negócio do corpo do erro HTTP sem perder tipagem. */
export function codigoDeErro(err: unknown): string | null {
  if (err && typeof err === 'object' && 'error' in err) {
    const corpo = (err as { error?: ErroApi }).error;
    return corpo?.code ?? corpo?.Code ?? null;
  }
  return null;
}

/**
 * Normaliza o ISO do slot para "YYYY-MM-DDTHH:mm:00" sem conversão de fuso —
 * convenção do portal (hora local tratada como UTC; regra 6c do AGENTS).
 */
export function slotParaDataInicio(slot: string): string {
  const partes = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(slot);
  return partes ? `${partes[1]}T${partes[2]}:00` : slot;
}

/**
 * Resolve os ids do payload a partir dos nomes da reserva — o DTO da reserva
 * (API_CONTRACTS §15.1) retorna apenas profissionalNome/servicoNome, enquanto o
 * POST do portal exige Guids válidos. Sem servicoNome, usa a preferência salva
 * na entrada ativa do dia. Compartilhado pela tela da reserva (deep link) e pelo
 * widget do portal (RN-074/075).
 */
@Injectable()
export class ReservaSlotResolverService {
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly listaEsperaService = inject(ListaEsperaService);

  async resolver(reserva: ListaEsperaReserva): Promise<IdsDaReserva | null> {
    const profissionais = await this.agendamentoPublicoService.getProfissionais().catch(() => []);

    // RN-074 — casamento por ID: o nome do DTO (NomeCompleto) pode divergir do nome
    // de exibição da listagem; por ID é determinístico.
    const profissional = reserva.profissionalId
      ? profissionais.find((p) => p.id === reserva.profissionalId)
      : profissionais.find((p) => p.nome === reserva.profissionalNome);
    if (!profissional) {
      return null;
    }

    // RN-074 — fila por horário: o cliente será agendado com o SEU serviço preferido
    // (da entrada ativa); fallback = serviço do slot vagado (id/nome do DTO).
    const entrada = await this.listaEsperaService.meuStatus().catch(() => null);
    if (entrada?.servicoId) {
      return { profissionalId: profissional.id, servicoId: entrada.servicoId };
    }
    if (reserva.servicoId) {
      return { profissionalId: profissional.id, servicoId: reserva.servicoId };
    }
    if (reserva.servicoNome) {
      const servicos = await this.agendamentoPublicoService.getServicosProfissional(profissional.id).catch(() => []);
      const servico = servicos.find((s) => s.nome === reserva.servicoNome);
      return servico ? { profissionalId: profissional.id, servicoId: servico.id } : null;
    }
    return null;
  }
}

import { ListaEsperaHelperService } from './lista-espera-helper.service';

describe('ListaEsperaHelperService', () => {
  let helper: ListaEsperaHelperService;

  beforeEach(() => {
    helper = new ListaEsperaHelperService();
  });

  it('deve mapear os quatro status para badge', () => {
    expect(helper.statusParaBadge('Ativa')?.label).toBe('Ativa');
    expect(helper.statusParaBadge('Convertida')?.label).toBe('Convertida');
    expect(helper.statusParaBadge('Removida')?.label).toBe('Removida');
    expect(helper.statusParaBadge('Expirada')?.label).toBe('Expirada');
  });

  it('deve retornar null para status desconhecido', () => {
    expect(helper.statusParaBadge('Inexistente')).toBeNull();
  });

  it('deve formatar a contagem regressiva da reserva em MM:SS', () => {
    const agora = Date.parse('2026-09-29T12:00:00Z');
    const expira = '2026-09-29T12:05:30Z';
    expect(helper.contagemReserva(expira, agora)).toBe('05:30');
  });

  it('deve fixar a contagem em 00:00 quando a reserva já expirou', () => {
    const agora = Date.parse('2026-09-29T12:10:00Z');
    expect(helper.contagemReserva('2026-09-29T12:05:30Z', agora)).toBe('00:00');
  });

  it('deve formatar a hora de entrada (HH:mm local)', () => {
    const hora = helper.horaDe('2026-09-29T12:34:00Z');
    expect(hora).toMatch(/^\d{2}:\d{2}$/);
  });

  it('deve retornar traço para timestamp inválido', () => {
    expect(helper.horaDe('')).toBe('—');
  });
});

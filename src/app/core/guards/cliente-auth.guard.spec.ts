import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, PRIMARY_OUTLET, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { clienteAuthGuard } from './cliente-auth.guard';
import { AgendamentoPublicoService } from '../services/agendamento-publico.service';

describe('clienteAuthGuard', () => {
  const rotaFake = {
    paramMap: { get: () => 'estab-x' },
    parent: null,
  } as unknown as ActivatedRouteSnapshot;

  const estadoComUrl = (url: string): RouterStateSnapshot => ({ url }) as unknown as RouterStateSnapshot;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('deve liberar a rota do portal quando o cliente está autenticado', async () => {
    const agendamentoPublicoService = TestBed.inject(AgendamentoPublicoService);
    spyOn(agendamentoPublicoService, 'getMe').and.resolveTo({ id: 'guid-cliente', nome: 'Cliente', email: 'cliente@teste.com' });

    const resultado = (await TestBed.runInInjectionContext(() =>
      clienteAuthGuard(rotaFake, estadoComUrl('/agendamento/estab-x/lista-espera/reserva/abc')),
    )) as boolean;

    expect(resultado).toBeTrue();
  });

  it('deve redirecionar para o login do portal com returnUrl do deep link quando não autenticado', async () => {
    const agendamentoPublicoService = TestBed.inject(AgendamentoPublicoService);
    spyOn(agendamentoPublicoService, 'getMe').and.resolveTo(null);

    const resultado = (await TestBed.runInInjectionContext(() =>
      clienteAuthGuard(rotaFake, estadoComUrl('/agendamento/estab-x/lista-espera/reserva/abc')),
    )) as UrlTree;

    const segmentos = resultado.root.children[PRIMARY_OUTLET]?.segments.map((s) => s.path) ?? [];
    expect(segmentos).toEqual(['agendamento', 'ESTAB-X', 'login']);
    expect(resultado.queryParamMap.get('returnUrl')).toBe('/agendamento/estab-x/lista-espera/reserva/abc');
  });
});

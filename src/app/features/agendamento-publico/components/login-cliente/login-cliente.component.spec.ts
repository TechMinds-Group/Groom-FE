import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { LoginClienteComponent } from './login-cliente.component';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { AuthClienteHelperService } from '../../services/auth-cliente-helper.service';
import { GoogleOAuthClienteService } from '../../services/google-oauth-cliente.service';
import { TemaPublicoService } from '../../services/tema-publico.service';

describe('LoginClienteComponent', () => {
  let component: LoginClienteComponent;
  let fixture: ComponentFixture<LoginClienteComponent>;
  let agendamentoPublicoService: AgendamentoPublicoService;
  let router: Router;

  let queryReturnUrl: string | null;

  const carregarTela = async (): Promise<void> => {
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(async () => {
    queryReturnUrl = null;
    await TestBed.configureTestingModule({
      imports: [LoginClienteComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (chave: string) => (chave === 'estabelecimento' ? 'estab-x' : null) },
              parent: null,
              queryParamMap: { get: (chave: string) => (chave === 'returnUrl' ? queryReturnUrl : null) },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginClienteComponent);
    component = fixture.componentInstance;
    agendamentoPublicoService = TestBed.inject(AgendamentoPublicoService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(TestBed.inject(AuthClienteHelperService), 'restaurarSessao');
    spyOn(TestBed.inject(GoogleOAuthClienteService), 'inicializar');
    spyOn(TestBed.inject(TemaPublicoService), 'restaurarTemaAnterior');
    // Falha graciosa ao carregar a identidade do estabelecimento (não afeta o destino pós-login)
    spyOn(TestBed.inject(EstabelecimentoService), 'carregarInfoPublico').and.rejectWith(new Error('indisponível'));
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve devolver o cliente ao deep link da reserva quando há returnUrl do mesmo estabelecimento', async () => {
    queryReturnUrl = '/agendamento/estab-x/lista-espera/reserva/abc';
    spyOn(agendamentoPublicoService, 'getMe').and.resolveTo({ id: 'guid', nome: 'Cliente', email: 'cliente@teste.com' });
    await carregarTela();

    expect(router.navigate).toHaveBeenCalledWith([
      '/',
      'agendamento',
      'estab-x',
      'lista-espera',
      'reserva',
      'abc',
    ]);
  });

  it('deve ir para o novo agendamento quando não há returnUrl', async () => {
    spyOn(agendamentoPublicoService, 'getMe').and.resolveTo({ id: 'guid', nome: 'Cliente', email: 'cliente@teste.com' });
    await carregarTela();

    expect(router.navigate).toHaveBeenCalledWith(['/agendamento', 'estab-x', 'novo']);
  });

  it('deve ignorar returnUrl de outro estabelecimento e ir para o novo agendamento', async () => {
    queryReturnUrl = '/agendamento/outro-estab/novo';
    spyOn(agendamentoPublicoService, 'getMe').and.resolveTo({ id: 'guid', nome: 'Cliente', email: 'cliente@teste.com' });
    await carregarTela();

    expect(router.navigate).toHaveBeenCalledWith(['/agendamento', 'estab-x', 'novo']);
  });
});

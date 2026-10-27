import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MeusAgendamentosComponent } from './meus-agendamentos.component';

describe('MeusAgendamentosComponent', () => {
  let component: MeusAgendamentosComponent;
  let fixture: ComponentFixture<MeusAgendamentosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeusAgendamentosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MeusAgendamentosComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve calcular desconto e total com cupom de 20%', () => {
    const item = {
      id: '1',
      profissionalId: 'p1',
      servicoId: 's1',
      planoId: null,
      servicoDuracao: 30,
      profissionalNome: 'Alex',
      servicoNome: 'Corte',
      servicoPreco: 80,
      dataInicio: '2026-10-26T15:30',
      dataFim: '2026-10-26T16:00',
      status: 'confirmado',
      tipo: 'servico',
      planoNome: undefined,
      cupomAniversarioCodigo: 'ANIV-X',
      cupomAniversarioPercentual: 20,
      podeAlterar: true,
      mensagemPrazo: null,
    };

    expect(component['descontoItem'](item)).toBe(16);
    expect(component['totalItem'](item)).toBe(64);
  });
});
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComandaHistoricoComponent } from './comanda-historico.component';
import { Comanda } from '../../../../core/models/comanda/comanda.model';

describe('ComandaHistoricoComponent', () => {
  let component: ComandaHistoricoComponent;
  let fixture: ComponentFixture<ComandaHistoricoComponent>;
  let httpMock: HttpTestingController;

  const comandasMock: Comanda[] = [
    {
      id: 'c2',
      numero: 2,
      clienteNome: 'João Souza',
      status: 'Fechada',
      valorTotal: 50,
      valorDesconto: 5,
      valorFinal: 45,
      fechadaEmUtc: '2026-09-21T15:00:00Z',
      createdAtUtc: '2026-09-21T10:00:00Z',
    },
    {
      id: 'c3',
      numero: 3,
      clienteNome: 'Maria Silva',
      status: 'Cancelada',
      valorTotal: 30,
      valorDesconto: 0,
      valorFinal: 30,
      fechadaEmUtc: null,
      canceladaEmUtc: '2026-09-22T18:00:00Z',
      createdAtUtc: '2026-09-22T17:00:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComandaHistoricoComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ComandaHistoricoComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar o histórico com filtros e exibir data de cancelamento quando fechadaEmUtc é null', async () => {
    component.filtroClienteId.set('cli1');
    component.filtroDataInicio.set('2026-09-01');

    const promise = component.carregar();
    const req = httpMock.expectOne(
      (r) => r.url === 'http://localhost:5000/comandas/historico',
    );
    expect(req.request.params.get('clienteId')).toBe('cli1');
    expect(req.request.params.get('dataInicio')).toBe('2026-09-01');
    expect(req.request.params.get('profissionalId')).toBeNull();
    req.flush(comandasMock);
    await promise;

    expect(component.comandas().length).toBe(2);
    expect(component.dataFechamento(component.comandas()[0])).toBe('2026-09-21T15:00:00Z');
    // Cancelada: exibe a data de cancelamento
    expect(component.dataFechamento(component.comandas()[1])).toBe('2026-09-22T18:00:00Z');
  });
});

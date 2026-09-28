import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ComandaFechamentoComponent } from './comanda-fechamento.component';
import { Comanda } from '../../../../core/models/comanda/comanda.model';

describe('ComandaFechamentoComponent', () => {
  let component: ComandaFechamentoComponent;
  let fixture: ComponentFixture<ComandaFechamentoComponent>;
  let httpMock: HttpTestingController;

  const comandaMock: Comanda = {
    id: 'c1',
    numero: 7,
    clienteNome: 'Maria Silva',
    status: 'Aberta',
    valorTotal: 200,
    valorDesconto: 0,
    valorFinal: 200,
    createdAtUtc: '2026-09-20T12:00:00Z',
    itens: [
      {
        id: 'i1',
        comandaId: 'c1',
        tipo: 'servico',
        servicoId: 's1',
        nomeItem: 'Corte',
        quantidade: 1,
        precoUnitario: 50,
        precoTotal: 50,
      },
      {
        id: 'i2',
        comandaId: 'c1',
        tipo: 'produto',
        nomeItem: 'Pomada',
        quantidade: 3,
        precoUnitario: 50,
        precoTotal: 150,
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComandaFechamentoComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComandaFechamentoComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve calcular desconto percentual e valor final em tempo real', async () => {
    const promise = component.ngOnInit();
    httpMock.expectOne((r) => r.url === 'http://localhost:5000/comandas/c1').flush(comandaMock);
    await promise;

    expect(component.subtotal()).toBe(200);

    component.selecionarTipo('percentual');
    component.descontoValor.set(10);
    expect(component.descontoCalculado()).toBeCloseTo(20);
    expect(component.valorFinal()).toBeCloseTo(180);
    expect(component.descontoInvalido()).toBeFalse();
  });

  it('deve calcular desconto em valor absoluto', async () => {
    const promise = component.ngOnInit();
    httpMock.expectOne((r) => r.url === 'http://localhost:5000/comandas/c1').flush(comandaMock);
    await promise;

    component.selecionarTipo('valor');
    component.descontoValor.set(50);
    expect(component.descontoCalculado()).toBeCloseTo(50);
    expect(component.valorFinal()).toBeCloseTo(150);
  });

  it('deve invalidar desconto que excede o valor total (ERR-104)', async () => {
    const promise = component.ngOnInit();
    httpMock.expectOne((r) => r.url === 'http://localhost:5000/comandas/c1').flush(comandaMock);
    await promise;

    component.selecionarTipo('percentual');
    component.descontoValor.set(150);
    expect(component.descontoInvalido()).toBeTrue();

    component.selecionarTipo('valor');
    component.descontoValor.set(250);
    expect(component.descontoInvalido()).toBeTrue();
    expect(component.valorFinal()).toBe(0);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ComandaDetalhesComponent } from './comanda-detalhes.component';
import { Comanda } from '../../../../core/models/comanda/comanda.model';

describe('ComandaDetalhesComponent', () => {
  let component: ComandaDetalhesComponent;
  let fixture: ComponentFixture<ComandaDetalhesComponent>;
  let httpMock: HttpTestingController;

  const comandaMock: Comanda = {
    id: 'c1',
    numero: 7,
    clienteNome: 'Maria Silva',
    status: 'Aberta',
    valorTotal: 100,
    valorDesconto: 0,
    valorFinal: 100,
    createdAtUtc: '2026-09-20T12:00:00Z',
    itens: [
      {
        id: 'i1',
        comandaId: 'c1',
        tipo: 'produto',
        nomeItem: 'Shampoo',
        quantidade: 2,
        precoUnitario: 10,
        precoTotal: 20,
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComandaDetalhesComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComandaDetalhesComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar a comanda pela rota e tratar itens null como lista vazia', async () => {
    const promise = component.ngOnInit();

    const reqComanda = httpMock.expectOne((r) => r.url === 'http://localhost:5000/comandas/c1');
    reqComanda.flush({ ...comandaMock, itens: null });

    const reqUsuarios = httpMock.expectOne((r) => r.url === 'http://localhost:5000/usuarios');
    reqUsuarios.flush([]);

    await promise;

    expect(component.comanda()?.numero).toBe(7);
    expect(component.itens().length).toBe(0);
    expect(component.comandaAberta()).toBeTrue();
  });

  it('não deve permitir reabrir para não admin (nenhuma requisição é feita)', async () => {
    // isAdmin() falso por padrão (sem usuário logado no TestBed)
    expect(component.isAdmin()).toBeFalse();
    await component.reabrirComanda();
    httpMock.verify();
  });
});

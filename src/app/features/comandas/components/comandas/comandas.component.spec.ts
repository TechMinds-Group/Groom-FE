import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComandasComponent } from './comandas.component';
import { Comanda } from '../../../../core/models/comanda/comanda.model';

describe('ComandasComponent', () => {
  let component: ComandasComponent;
  let fixture: ComponentFixture<ComandasComponent>;
  let httpMock: HttpTestingController;

  const comandasMock: Comanda[] = [
    {
      id: 'c1',
      numero: 1,
      clienteNome: 'Maria Silva',
      status: 'Aberta',
      valorTotal: 100,
      valorDesconto: 0,
      valorFinal: 100,
      itemCount: 2,
      createdAtUtc: '2026-09-20T12:00:00Z',
    },
    {
      id: 'c2',
      numero: 2,
      clienteNome: 'João Souza',
      status: 'Fechada',
      valorTotal: 50,
      valorDesconto: 5,
      valorFinal: 45,
      itemCount: 1,
      createdAtUtc: '2026-09-21T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComandasComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ComandasComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar as comandas de todos os status por padrão', async () => {
    const promise = component.ngOnInit();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:5000/comandas');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(comandasMock);
    await promise;

    expect(component.comandas().length).toBe(2);
    expect(component.carregando()).toBeFalse();
  });

  it('deve enviar o filtro de status ao selecionar Abertas', async () => {
    const promise = component.selecionarFiltro('Aberta');
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:5000/comandas');
    expect(req.request.params.get('status')).toBe('Aberta');
    req.flush([comandasMock[0]]);
    await promise;

    expect(component.filtroSelecionado()).toBe('Aberta');
    expect(component.comandas().every((c) => c.status === 'Aberta')).toBeTrue();
  });
});

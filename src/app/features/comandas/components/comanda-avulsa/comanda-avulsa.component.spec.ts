import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComandaAvulsaComponent } from './comanda-avulsa.component';

describe('ComandaAvulsaComponent', () => {
  let component: ComandaAvulsaComponent;
  let fixture: ComponentFixture<ComandaAvulsaComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComandaAvulsaComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ComandaAvulsaComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve filtrar clientes por nome ou celular', async () => {
    const promise = component.ngOnInit();
    httpMock.expectOne((r) => r.url === 'http://localhost:5000/clientes').flush([
      { id: 'cli1', nome: 'Maria Silva', celular: '(11) 98888-1111', status: 'Ativo' },
      { id: 'cli2', nome: 'João Souza', celular: '(21) 97777-2222', status: 'Ativo' },
    ]);
    await promise;

    component.buscaCliente.set('maria');
    expect(component.resultados().length).toBe(1);
    expect(component.resultados()[0].id).toBe('cli1');

    component.buscaCliente.set('97777');
    expect(component.resultados().length).toBe(1);
    expect(component.resultados()[0].id).toBe('cli2');

    component.buscaCliente.set('');
    expect(component.resultados().length).toBe(0);
  });
});

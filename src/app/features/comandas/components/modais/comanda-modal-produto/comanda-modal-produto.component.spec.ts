import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComandaModalProdutoComponent } from './comanda-modal-produto.component';
import { AdicionarProdutoRequest } from '../../../../../core/models/comanda/comanda.model';

describe('ComandaModalProdutoComponent', () => {
  let component: ComandaModalProdutoComponent;
  let fixture: ComponentFixture<ComandaModalProdutoComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComandaModalProdutoComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ComandaModalProdutoComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('não deve confirmar sem produto selecionado', () => {
    let emitido = false;
    component.confirm.subscribe(() => (emitido = true));

    component.confirmar();

    expect(emitido).toBeFalse();
  });

  /** Abre o modal e consome a leitura do estoque (carregada no efeito de abertura). */
  function abrirEcarregarEstoque(): void {
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/estoque')).flush([
      {
        id: 'p1',
        nome: 'Cera Modeladora',
        categoria: 'Penteados',
        marca: 'X',
        precoVenda: 25,
        quantidadeAtual: 10,
        quantidadeMinima: 2,
        unidadeMedida: 'un',
        status: 'Ativo',
      },
    ]);
  }

  it('deve confirmar com produto selecionado e quantidade válida', async () => {
    let emitido: AdicionarProdutoRequest | null = null;
    component.confirm.subscribe((p) => (emitido = p));

    abrirEcarregarEstoque();
    // Drena as microtasks: o set do signal do service ocorre após o await do firstValueFrom.
    await fixture.whenStable();
    component['produtoControl'].setValue('p1');
    component.confirmar();

    expect(emitido!).toEqual({ produtoId: 'p1', quantidade: 1, observacoes: undefined });
  });

  it('não deve confirmar quando a quantidade excede o saldo', () => {
    let emitido = false;
    component.confirm.subscribe(() => (emitido = true));

    abrirEcarregarEstoque();
    component['produtoControl'].setValue('p1');
    component['quantidade'].set(11);
    component.confirmar();

    expect(emitido).toBeFalse();
  });
});

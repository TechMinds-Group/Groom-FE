import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComandaModalProdutoComponent } from './comanda-modal-produto.component';

describe('ComandaModalProdutoComponent', () => {
  let component: ComandaModalProdutoComponent;
  let fixture: ComponentFixture<ComandaModalProdutoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComandaModalProdutoComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ComandaModalProdutoComponent);
    component = fixture.componentInstance;
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
});

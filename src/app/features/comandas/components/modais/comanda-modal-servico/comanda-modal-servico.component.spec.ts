import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComandaModalServicoComponent } from './comanda-modal-servico.component';

describe('ComandaModalServicoComponent', () => {
  let component: ComandaModalServicoComponent;
  let fixture: ComponentFixture<ComandaModalServicoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComandaModalServicoComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ComandaModalServicoComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('não deve confirmar sem serviço e profissional selecionados', () => {
    let emitido = false;
    component.confirm.subscribe(() => (emitido = true));

    component.confirmar();

    expect(emitido).toBeFalse();
  });
});

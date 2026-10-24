import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AniversariantesConfigComponent } from './aniversariantes-config.component';

describe('AniversariantesConfigComponent', () => {
  let component: AniversariantesConfigComponent;
  let fixture: ComponentFixture<AniversariantesConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AniversariantesConfigComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AniversariantesConfigComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve desabilitar a validade do cupom quando o desconto padrão é 0 (RN-080)', () => {
    component.ngOnInit();
    component['form'].controls.percentual.setValue(0);

    expect(component['form'].controls.validade.disabled).toBeTrue();
  });

  it('deve habilitar a validade do cupom quando há desconto (RN-080)', () => {
    component.ngOnInit();
    component['form'].controls.percentual.setValue(20);

    expect(component['form'].controls.validade.disabled).toBeFalse();
  });

  it('deve montar o preview sem menção a cupom quando o desconto é 0 (CR-004)', () => {
    component.ngOnInit();
    component['form'].controls.percentual.setValue(0);

    const preview = component.previewMensagem;
    expect(preview).not.toContain('desconto');
    expect(preview).not.toContain('cupom');
  });
});

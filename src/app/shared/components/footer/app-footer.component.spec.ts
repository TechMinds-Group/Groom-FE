import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppFooterComponent } from './app-footer.component';

describe('AppFooterComponent', () => {
  let component: AppFooterComponent;
  let fixture: ComponentFixture<AppFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppFooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o copyright com o ano atual e o link do site oficial', () => {
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain(String(component.anoAtual));
    expect(texto).toContain('Groom');
    expect(texto).toContain('portal.techminds.net.br');
    const link = fixture.nativeElement.querySelector('a');
    expect(link?.href).toBe('https://portal.techminds.net.br/');
  });
});

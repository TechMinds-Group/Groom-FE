import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstabelecimentoConfigComponent } from './estabelecimento-config.component';

describe('EstabelecimentoConfigComponent', () => {
  let component: EstabelecimentoConfigComponent;
  let fixture: ComponentFixture<EstabelecimentoConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstabelecimentoConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstabelecimentoConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

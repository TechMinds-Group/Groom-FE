import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfissionalNumeroModalComponent } from './profissional-numero-modal.component';

describe('ProfissionalNumeroModalComponent', () => {
  let component: ProfissionalNumeroModalComponent;
  let fixture: ComponentFixture<ProfissionalNumeroModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfissionalNumeroModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfissionalNumeroModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

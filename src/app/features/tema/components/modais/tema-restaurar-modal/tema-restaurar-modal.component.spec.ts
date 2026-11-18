import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TemaRestaurarModalComponent } from './tema-restaurar-modal.component';

describe('TemaRestaurarModalComponent', () => {
  let component: TemaRestaurarModalComponent;
  let fixture: ComponentFixture<TemaRestaurarModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemaRestaurarModalComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TemaRestaurarModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
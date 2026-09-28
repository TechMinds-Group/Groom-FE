import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AgendaModalDiaComponent } from './agenda-modal-dia.component';

describe('AgendaModalDiaComponent', () => {
  let component: AgendaModalDiaComponent;
  let fixture: ComponentFixture<AgendaModalDiaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaModalDiaComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaModalDiaComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

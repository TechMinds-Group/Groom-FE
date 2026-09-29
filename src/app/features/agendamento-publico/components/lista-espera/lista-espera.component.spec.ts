import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ListaEsperaComponent } from './lista-espera.component';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';

describe('ListaEsperaComponent', () => {
  let component: ListaEsperaComponent;
  let fixture: ComponentFixture<ListaEsperaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaEsperaComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => 'barbearia-teste' },
              parent: null,
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaEsperaComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve registrar o estabelecimento do path no init', () => {
    fixture.detectChanges();
    const service = TestBed.inject(AgendamentoPublicoService);
    expect(service.estabelecimento()).toBe('BARBEARIA-TESTE');
  });
});

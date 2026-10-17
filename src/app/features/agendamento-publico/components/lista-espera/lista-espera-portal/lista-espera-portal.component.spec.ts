import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ListaEsperaPortalComponent } from './lista-espera-portal.component';
import { ListaEsperaItem } from '../../../../../core/models/lista-espera/lista-espera.model';

describe('ListaEsperaPortalComponent', () => {
  let component: ListaEsperaPortalComponent;
  let fixture: ComponentFixture<ListaEsperaPortalComponent>;
  let httpMock: HttpTestingController;

  const entradaAtiva: ListaEsperaItem = {
    id: 'guid-entrada',
    clienteId: 'guid-cliente',
    clienteNome: 'Cliente Teste',
    posicao: 3,
    servicoId: null,
    servicoNome: null,
    profissionalId: null,
    profissionalNome: null,
    horaJanelaInicio: null,
    status: 'Ativa',
    criadaEmUtc: '2026-09-29T12:00:00Z',
    reservaAtiva: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaEsperaPortalComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaEsperaPortalComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar o card de status com a posição quando há entrada ativa', async () => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.endsWith('/lista-espera/meu-status'));
    req.flush(entradaAtiva);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.entrada()?.posicao).toBe(3);
    expect(component.carregando()).toBeFalse();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Você está na lista de espera');
    expect(el.textContent).toContain('Posição 3 do dia');
  });

  it('deve exibir o estado sem entrada quando meu-status retorna null', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/lista-espera/meu-status')).flush(null);
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Você não está na lista de espera hoje');
    expect(component.modalAberto()).toBeFalse();
  });

  it('deve remover a entrada ao sair da lista e voltar ao estado inicial', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/lista-espera/meu-status')).flush(entradaAtiva);
    await fixture.whenStable();

    const promessaSaida = component.sair();
    const deleteReq = httpMock.expectOne((r) => r.url.endsWith('/lista-espera/guid-entrada'));
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null, { status: 204, statusText: 'No Content' });
    await promessaSaida;

    expect(component.entrada()).toBeNull();
  });

  // RN-074 — cliente já na fila que pede a lista de novo (header/passo): abre o modal
  // de STATUS em vez do formulário de preferências.
  it('deve abrir o modal de status ao pedir entrada quando já está na lista', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/lista-espera/meu-status')).flush(entradaAtiva);
    await fixture.whenStable();

    component.abrirComPreset({ servicoId: null });

    expect(component.modalStatus()).toBeTrue();
    expect(component.modalAberto()).toBeFalse();
  });

  // RN-074 — sair pelo modal de status remove a entrada e fecha o modal.
  it('deve sair da lista pelo modal de status e fechar o modal', async () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url.endsWith('/lista-espera/meu-status')).flush(entradaAtiva);
    await fixture.whenStable();

    component.modalStatus.set(true);
    const promessaSaida = component.sairDoModal();
    const deleteReq = httpMock.expectOne((r) => r.url.endsWith('/lista-espera/guid-entrada'));
    deleteReq.flush(null, { status: 204, statusText: 'No Content' });
    await promessaSaida;

    expect(component.entrada()).toBeNull();
    expect(component.modalStatus()).toBeFalse();
  });
});

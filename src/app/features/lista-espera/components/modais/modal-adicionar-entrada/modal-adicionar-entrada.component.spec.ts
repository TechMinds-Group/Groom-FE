import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ModalAdicionarEntradaComponent } from './modal-adicionar-entrada.component';
import { AdicionarListaEsperaPayload } from '../../../../../core/models/lista-espera/lista-espera.model';

describe('ModalAdicionarEntradaComponent', () => {
  let component: ModalAdicionarEntradaComponent;
  let fixture: ComponentFixture<ModalAdicionarEntradaComponent>;
  let httpMock: HttpTestingController;

  function flushOpcoes(): void {
    httpMock.expectOne((r) => r.url.endsWith('/clientes')).flush([
      { id: 'cli-1', nome: 'Ana', sobrenome: 'Silva', celular: '51999990001', status: 'Ativo' },
      { id: 'cli-2', nome: 'Bruno', sobrenome: null, celular: '', status: 'Inativo' },
    ]);
    httpMock.expectOne((r) => r.url.endsWith('/catalogo')).flush([
      { id: 'svc-1', nome: 'Corte', status: 'Ativo' },
    ]);
    httpMock
      .expectOne((r) => r.url.endsWith('/usuarios'))
      .flush([
        { id: 'prof-1', nome: 'Carlos', sobrenome: 'Souza', perfil: 'Profissional' },
      ]);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalAdicionarEntradaComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalAdicionarEntradaComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar opções de cliente/serviço/profissional ao abrir e emitir payload com cliente obrigatório', async () => {
    let emitido: AdicionarListaEsperaPayload | null = null;
    component.confirm.subscribe((p) => (emitido = p));
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();

    await fixture.whenStable();
    flushOpcoes();
    // Macrotask: entre macrotasks toda a fila de microtasks das promise chains
    // do modal (flush → firstValueFrom → .then dos signals) é executada.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    // Só clientes ativos entram nas opções, com celular entre parênteses
    expect(component['clienteOptions']().map((o) => o.value)).toEqual(['cli-1']);
    expect(component['clienteOptions']()[0].label).toBe('Ana Silva (51999990001)');
    expect(component['servicoOptions']().map((o) => o.value)).toEqual(['', 'svc-1']);
    expect(component['profissionalOptions']().map((o) => o.value)).toEqual(['', 'prof-1']);

    component.form.controls.clienteId.setValue('cli-1');
    component.form.controls.servicoId.setValue('svc-1');
    component.form.controls.profissionalId.setValue('prof-1');
    component.form.controls.horaJanelaInicio.setValue('14:00');
    component.confirmar();

    expect(emitido!).toEqual({
      clienteId: 'cli-1',
      servicoId: 'svc-1',
      profissionalId: 'prof-1',
      horaJanelaInicio: '14:00',
    });
  });

  it('deve enviar preferências vazias como null quando apenas o cliente é informado', () => {
    let emitido: AdicionarListaEsperaPayload | null = null;
    component.confirm.subscribe((p) => (emitido = p));
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();

    // A abertura dispara a carga de opções — flush evita open requests no verify().
    flushOpcoes();

    component.form.controls.clienteId.setValue('cli-1');
    component.confirmar();

    expect(emitido!).toEqual({
      clienteId: 'cli-1',
      servicoId: null,
      profissionalId: null,
      horaJanelaInicio: null,
    });
  });

  it('não deve emitir payload sem cliente selecionado (campo obrigatório)', () => {
    let emitido: AdicionarListaEsperaPayload | null = null;
    component.confirm.subscribe((p) => (emitido = p));
    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();

    // A abertura dispara a carga de opções — flush evita open requests no verify().
    flushOpcoes();

    component.confirmar();

    expect(emitido).toBeNull();
    expect(component.form.controls.clienteId.touched).toBeTrue();
  });
});

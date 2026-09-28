import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComandaService } from './comanda.service';
import { Comanda, ComandaItem } from '../models/comanda/comanda.model';

describe('ComandaService', () => {
  let service: ComandaService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:5000/comandas';

  const comandaMock: Comanda = {
    id: 'c1',
    numero: 1,
    clienteNome: 'Maria Silva',
    status: 'Aberta',
    valorTotal: 100,
    valorDesconto: 0,
    tipoDesconto: null,
    valorFinal: 100,
    itens: null,
    itemCount: 0,
    createdAtUtc: '2026-09-20T12:00:00Z',
  };

  const itemMock: ComandaItem = {
    id: 'i1',
    comandaId: 'c1',
    tipo: 'produto',
    produtoId: 'p1',
    nomeItem: 'Shampoo',
    quantidade: 2,
    precoUnitario: 10,
    precoTotal: 20,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ComandaService],
    });
    service = TestBed.inject(ComandaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('getComandas deve chamar a raiz sem status quando filtro vazio', () => {
    service.getComandas().subscribe((res) => {
      expect(res).toEqual([comandaMock]);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([comandaMock]);
  });

  it('getComandas deve enviar status como query param', () => {
    service.getComandas('Aberta').subscribe();

    const req = httpMock.expectOne(`${baseUrl}?status=Aberta`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getComanda deve chamar GET /comandas/{id}', () => {
    service.getComanda('c1').subscribe((res) => {
      expect(res).toEqual(comandaMock);
    });

    const req = httpMock.expectOne(`${baseUrl}/c1`);
    expect(req.request.method).toBe('GET');
    req.flush(comandaMock);
  });

  it('criarAvulsa deve chamar POST /comandas/avulsa com o body', () => {
    service
      .criarAvulsa({ clienteNome: 'Cliente Livre', observacoes: 'obs' })
      .subscribe((res) => {
        expect(res).toEqual(comandaMock);
      });

    const req = httpMock.expectOne(`${baseUrl}/avulsa`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ clienteNome: 'Cliente Livre', observacoes: 'obs' });
    req.flush(comandaMock);
  });

  it('adicionarProduto deve chamar POST /comandas/{id}/produtos', () => {
    service.adicionarProduto('c1', { produtoId: 'p1', quantidade: 2 }).subscribe((res) => {
      expect(res).toEqual(itemMock);
    });

    const req = httpMock.expectOne(`${baseUrl}/c1/produtos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ produtoId: 'p1', quantidade: 2 });
    req.flush(itemMock);
  });

  it('adicionarServico deve chamar POST /comandas/{id}/servicos', () => {
    service
      .adicionarServico('c1', { servicoId: 's1', profissionalId: 'u1' })
      .subscribe();

    const req = httpMock.expectOne(`${baseUrl}/c1/servicos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ servicoId: 's1', profissionalId: 'u1' });
    req.flush(itemMock);
  });

  it('removerItem deve chamar DELETE /comandas/{id}/itens/{itemId} e tratar o corpo { message } (200)', () => {
    service.removerItem('c1', 'i1').subscribe((res) => {
      expect(res.message).toBe('Item removido.');
    });

    const req = httpMock.expectOne(`${baseUrl}/c1/itens/i1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Item removido.' });
  });

  it('fechar deve chamar PUT /comandas/{id}/fechar com desconto e observações', () => {
    service
      .fechar('c1', { desconto: { tipo: 'percentual', valor: 10 }, observacoes: 'pgto pix' })
      .subscribe((res) => {
        expect(res.status).toBe('Fechada');
      });

    const req = httpMock.expectOne(`${baseUrl}/c1/fechar`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      desconto: { tipo: 'percentual', valor: 10 },
      observacoes: 'pgto pix',
    });
    req.flush({ ...comandaMock, status: 'Fechada', valorDesconto: 10, valorFinal: 90 });
  });

  it('reabrir deve chamar PUT /comandas/{id}/reabrir', () => {
    service.reabrir('c1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/c1/reabrir`);
    expect(req.request.method).toBe('PUT');
    req.flush(comandaMock);
  });

  it('cancelar deve chamar PUT /comandas/{id}/cancelar', () => {
    service.cancelar('c1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/c1/cancelar`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...comandaMock, status: 'Cancelada' });
  });

  it('getHistorico deve chamar GET /comandas/historico com os filtros preenchidos', () => {
    service
      .getHistorico({
        clienteId: 'cli1',
        dataInicio: '2026-09-01',
        dataFim: '2026-09-30',
        profissionalId: 'u1',
      })
      .subscribe();

    const req = httpMock.expectOne(
      `${baseUrl}/historico?clienteId=cli1&dataInicio=2026-09-01&dataFim=2026-09-30&profissionalId=u1`,
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getHistorico deve omitir filtros vazios', () => {
    service.getHistorico({}).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/historico`);
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });
});

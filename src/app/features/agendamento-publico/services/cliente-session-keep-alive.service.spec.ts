import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { AgendamentoPublicoService } from '../../../core/services/agendamento-publico.service';
import { ClienteSessionKeepAliveService } from './cliente-session-keep-alive.service';

describe('ClienteSessionKeepAliveService', () => {
  let service: ClienteSessionKeepAliveService;
  let httpMock: HttpTestingController;
  let agendamentoPublicoService: AgendamentoPublicoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ClienteSessionKeepAliveService],
    });
    service = TestBed.inject(ClienteSessionKeepAliveService);
    httpMock = TestBed.inject(HttpTestingController);
    agendamentoPublicoService = TestBed.inject(AgendamentoPublicoService);
    agendamentoPublicoService.setEstabelecimento('TESTE');
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    service.stop();
    httpMock.verify();
  });

  it('não inicia o polling quando não há estabelecimento definido', async () => {
    agendamentoPublicoService.setEstabelecimento('');
    await service.start();
    jasmine.clock().tick(60_000);
    httpMock.expectNone(`${environment.apiUrl}/api/publico/TESTE/agendamento/refresh-session`);
  });

  it('mantém a sessão chamando o keep-alive a cada 20s quando há cliente logado', async () => {
    const startPromise = service.start();
    const meReq = httpMock.expectOne(`${environment.apiUrl}/api/publico/TESTE/agendamento/me`);
    meReq.flush({ id: 'c1', nome: 'QA', email: 'qa@groom.dev' });
    await startPromise;

    jasmine.clock().tick(20_000);
    httpMock.expectOne(`${environment.apiUrl}/api/publico/TESTE/agendamento/refresh-session`);
    jasmine.clock().tick(20_000);
    httpMock.expectOne(`${environment.apiUrl}/api/publico/TESTE/agendamento/refresh-session`);
  });

  it('não inicia o polling quando não há cliente logado (getMe 401)', async () => {
    const startPromise = service.start();
    const meReq = httpMock.expectOne(`${environment.apiUrl}/api/publico/TESTE/agendamento/me`);
    meReq.flush({ message: 'não autenticado' }, { status: 401, statusText: 'Unauthorized' });
    await startPromise;

    jasmine.clock().tick(60_000);
    httpMock.expectNone(`${environment.apiUrl}/api/publico/TESTE/agendamento/refresh-session`);
  });
});

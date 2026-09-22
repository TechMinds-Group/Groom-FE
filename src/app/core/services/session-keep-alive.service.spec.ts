import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SessionKeepAliveService } from './session-keep-alive.service';
import { environment } from '../../../environments/environment';

describe('SessionKeepAliveService', () => {
  let service: SessionKeepAliveService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SessionKeepAliveService],
    });
    service = TestBed.inject(SessionKeepAliveService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.stop();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('start() deve iniciar intervalo de 20s', fakeAsync(() => {
    service.start();

    // Avançar 20s — deve disparar requisição
    tick(20000);

    const req = httpMock.expectOne(`${environment.apiUrl}/api/account/refresh-session`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('X-Skip-Error-Toast')).toBe('true');

    req.flush({ ok: true });
  }));

  it('start() não deve criar múltiplos intervalos', fakeAsync(() => {
    service.start();
    service.start(); // segundo start deve ser ignorado
    service.start(); // terceiro start deve ser ignorado

    tick(20000);

    // Apenas 1 requisição, não 3
    const req = httpMock.expectOne(`${environment.apiUrl}/api/account/refresh-session`);
    req.flush({ ok: true });
  }));

  it('stop() deve parar o polling', fakeAsync(() => {
    service.start();
    service.stop();

    tick(20000);

    // Nenhuma requisição deve ter sido feita
    httpMock.expectNone(`${environment.apiUrl}/api/account/refresh-session`);
  }));

  it('deve parar automaticamente em caso de erro 401', fakeAsync(() => {
    service.start();

    tick(20000);

    const req = httpMock.expectOne(`${environment.apiUrl}/api/account/refresh-session`);
    req.flush({ ok: false }, { status: 401, statusText: 'Unauthorized' });

    // Após erro, o polling deve parar — avançar mais 20s não deve gerar requisição
    tick(20000);
    httpMock.expectNone(`${environment.apiUrl}/api/account/refresh-session`);
  }));

  it('start() e stop() podem ser chamados múltiplas vezes sem erro', () => {
    service.start();
    service.stop();
    service.start();
    service.stop();
    service.start();
    service.stop();
    expect(true).toBeTrue();
  });
});
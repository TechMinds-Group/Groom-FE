import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { WhatsAppProfissionalService } from './whatsapp-profissional.service';

describe('WhatsAppProfissionalService', () => {
  let service: WhatsAppProfissionalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WhatsAppProfissionalService],
    });
    service = TestBed.inject(WhatsAppProfissionalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

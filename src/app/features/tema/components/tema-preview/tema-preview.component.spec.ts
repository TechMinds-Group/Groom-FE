import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TemaPreviewComponent } from './tema-preview.component';
import { TemaLeitura } from '../../../../core/models/tema/tema.model';

describe('TemaPreviewComponent', () => {
  let component: TemaPreviewComponent;
  let fixture: ComponentFixture<TemaPreviewComponent>;

  const temaConfigurado: TemaLeitura = {
    configurado: true,
    modoPaleta: 'Unica',
    primaria: '#123456',
    secundaria: '#234567',
    acento: '#345678',
    fundo: '#FFFFFF',
    texto: '#111111',
    escuroPrimaria: null,
    escuroSecundaria: null,
    escuroAcento: null,
    escuroFundo: null,
    escuroTexto: null,
    logoUrl: null,
    fonteTitulo: null,
    fonteCorpo: null,
    gradientes: null,
    tokens: null,
    atualizadoEm: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemaPreviewComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TemaPreviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tema', temaConfigurado);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve aplicar as variáveis do tema no elemento host', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.style.getPropertyValue('--tema-primaria')).toBe('#123456');
  });
});

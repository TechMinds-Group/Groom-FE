import { TestBed } from '@angular/core/testing';
import { StatusListaEsperaPipe } from './status-lista-espera.pipe';
import { ListaEsperaHelperService } from '../services/lista-espera-helper.service';

describe('StatusListaEsperaPipe', () => {
  let pipe: StatusListaEsperaPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // O helper é fornecido pelo componente pai (sem providedIn: 'root').
      providers: [ListaEsperaHelperService],
    });
    // O pipe usa inject() no helper — construção dentro do contexto de injeção.
    pipe = TestBed.runInInjectionContext(() => new StatusListaEsperaPipe());
  });

  it('deve mapear cada status para o badge correspondente', () => {
    expect(pipe.transform('Ativa')?.label).toBe('Ativa');
    expect(pipe.transform('Convertida')?.label).toBe('Convertida');
    expect(pipe.transform('Removida')?.label).toBe('Removida');
    expect(pipe.transform('Expirada')?.label).toBe('Expirada');
  });

  it('deve retornar null quando o status não é reconhecido', () => {
    expect(pipe.transform('Outro')).toBeNull();
  });
});

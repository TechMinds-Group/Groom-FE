import {
  TemaEditorForm,
  criarCamposVazios,
  temaPreviewDeForm,
  usoDeSlot,
  TEMA_CORES_PADRAO,
  TEMA_SLOT_USO,
} from './tema-editor.model';
import { TEMA_SLOTS_BASE, TEMA_SLOTS_ESCURO } from '../../../core/models/tema/tema.model';

/** Formulário base com um campo preenchido (helper dos testes). */
function form(overrides?: Partial<TemaEditorForm>): TemaEditorForm {
  return {
    modoPaleta: 'Unica',
    base: criarCamposVazios(TEMA_SLOTS_BASE),
    escuro: criarCamposVazios(TEMA_SLOTS_ESCURO),
    logoUrl: '',
    fonteTitulo: '',
    fonteCorpo: '',
    tokensJson: '',
    ...overrides,
  };
}

describe('tema-editor.model — temaPreviewDeForm', () => {
  it('deve montar o preview fiel ao formulário mesmo sem tema configurado (RN-100)', () => {
    const base = criarCamposVazios(TEMA_SLOTS_BASE);
    base['fundo'] = { tipo: 'solido', cor: '#ABCDEF', cor1: '#ABCDEF', cor2: '', direcao: 'horizontal' };

    const preview = temaPreviewDeForm(form({ base }));

    expect(preview.configurado).toBeTrue();
    expect(preview.fundo).toBe('#ABCDEF');
  });

  it('deve preencher slots vazios do preview com a paleta padrão do sistema (RN-100)', () => {
    const preview = temaPreviewDeForm(form());

    expect(preview.primaria).toBe(TEMA_CORES_PADRAO['primaria']);
    expect(preview.fundo).toBe(TEMA_CORES_PADRAO['fundo']);
    expect(preview.texto).toBe(TEMA_CORES_PADRAO['texto']);
  });

  it('deve zerar o grupo escuro no preview quando modoPaleta é Unica (RN-099)', () => {
    const preview = temaPreviewDeForm(form());

    expect(preview.modoPaleta).toBe('Unica');
    expect(preview.escuroFundo).toBeNull();
    expect(preview.escuroTexto).toBeNull();
  });

  it('deve refletir o grupo escuro preenchido quando modoPaleta é PorModo (RN-099)', () => {
    const escuro = criarCamposVazios(TEMA_SLOTS_ESCURO);
    escuro['escuroFundo'] = { tipo: 'solido', cor: '#0B0F1A', cor1: '#0B0F1A', cor2: '', direcao: 'horizontal' };

    const preview = temaPreviewDeForm(form({ modoPaleta: 'PorModo', escuro }));

    expect(preview.modoPaleta).toBe('PorModo');
    expect(preview.escuroFundo).toBe('#0B0F1A');
    // Slots escuros não preenchidos caem na paleta escura padrão.
    expect(preview.escuroTexto).not.toBeNull();
  });

  it('não deve quebrar o preview com tokens JSON inválido (preview tolerante)', () => {
    const preview = temaPreviewDeForm(form({ tokensJson: '{ "raio": ' }));

    expect(preview.tokens).toBeNull();
  });
});

describe('tema-editor.model — legenda de uso por slot', () => {
  it('deve ter uso definido para todos os slots da paleta base', () => {
    for (const slot of TEMA_SLOTS_BASE) {
      expect(usoDeSlot(slot)).toBe(TEMA_SLOT_USO[slot]);
      expect(usoDeSlot(slot)).toBeTruthy();
    }
  });

  it('deve reutilizar os usos da base para os slots do modo escuro (RN-099)', () => {
    expect(usoDeSlot('escuroPrimaria')).toBe(TEMA_SLOT_USO['primaria']);
    expect(usoDeSlot('escuroFundo')).toBe(TEMA_SLOT_USO['fundo']);
  });
});

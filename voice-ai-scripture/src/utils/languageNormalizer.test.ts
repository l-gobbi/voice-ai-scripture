import { normalizeSpeechLanguage } from './languageNormalizer';

describe('normalizeSpeechLanguage', () => {
  it('defaults to en-US when language is missing or empty', () => {
    expect(normalizeSpeechLanguage()).toBe('en-US');
    expect(normalizeSpeechLanguage('')).toBe('en-US');
    expect(normalizeSpeechLanguage('   ')).toBe('en-US');
  });

  it('normalizes Portuguese language variants to pt-BR', () => {
    expect(normalizeSpeechLanguage('pt')).toBe('pt-BR');
    expect(normalizeSpeechLanguage('pt-br')).toBe('pt-BR');
    expect(normalizeSpeechLanguage('PT-BR')).toBe('pt-BR');
    expect(normalizeSpeechLanguage(' pt ')).toBe('pt-BR');
  });

  it('normalizes English language variants to en-US', () => {
    expect(normalizeSpeechLanguage('en')).toBe('en-US');
    expect(normalizeSpeechLanguage('en-us')).toBe('en-US');
    expect(normalizeSpeechLanguage('EN-US')).toBe('en-US');
    expect(normalizeSpeechLanguage(' en ')).toBe('en-US');
  });

  it('preserves other explicit BCP-47 language tags', () => {
    expect(normalizeSpeechLanguage('es-ES')).toBe('es-ES');
    expect(normalizeSpeechLanguage('fr-FR')).toBe('fr-FR');
  });
});

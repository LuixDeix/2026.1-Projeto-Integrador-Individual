import { gerarCsvLeituras } from '../views/historicoView.js';
import { sanitizarCelulaCsv } from '../services/cardHelpers.js';

/**
 * Evidência da ameaça A5 — CSV/Formula Injection no export do Histórico.
 * Ver docs/dashboard/threat-model.md (seção A5) e
 * docs/test-strategy/test-strategy.md (§1.9, risco #11).
 *
 * Cobre dois requisitos do fechamento da ameaça:
 *  1. Uma célula que começaria com `=` (fórmula executável no Excel/Sheets)
 *     é neutralizada — sai prefixada com apóstrofo.
 *  2. Um valor numérico legítimo (ex: 25.5) permanece intacto, sem prefixo.
 */
describe('historicoView CSV — formula injection (ameaça A5)', () => {
  test('canteiroId iniciado com "=" é neutralizado com prefixo de apóstrofo', () => {
    const csv = gerarCsvLeituras([
      {
        dataHora: '2026-06-14T10:00:00Z',
        canteiroId: '=cmd|\' /C calc\'!A1',
        temperatura: 22,
        umidadeAr: 60,
        umidadeSoloPorcentagem: 55,
        luzSolar: 80,
      },
    ]);

    // A fórmula não pode aparecer "crua" (sem prefixo) na linha do CSV.
    expect(csv).not.toContain(",=cmd");
    // O Excel/Sheets só passa a tratar como texto literal com o apóstrofo na frente.
    expect(csv).toContain(",'=cmd|' /C calc'!A1,");
  });

  test('canteiroId com HYPERLINK maliciosa é neutralizada', () => {
    const csv = gerarCsvLeituras([
      {
        dataHora: '2026-06-14T10:00:00Z',
        canteiroId: '=HYPERLINK("http://evil.tld/roubo","clique")',
        temperatura: 22,
      },
    ]);

    expect(csv).not.toContain(',=HYPERLINK');
    expect(csv).toContain(",'=HYPERLINK(");
  });

  test('valor numérico legítimo (25.5) permanece intacto, sem prefixo', () => {
    const csv = gerarCsvLeituras([
      {
        dataHora: '2026-06-14T10:00:00Z',
        canteiroId: 'A',
        temperatura: 25.5,
        umidadeAr: 60,
        umidadeSoloPorcentagem: 55,
        luzSolar: 80,
      },
    ]);

    expect(csv).toContain(',25.5,');
    expect(csv).not.toContain("'25.5");
  });

  test('temperatura negativa legítima (ex: -3.2°C) não é confundida com fórmula', () => {
    const csv = gerarCsvLeituras([
      {
        dataHora: '2026-06-14T10:00:00Z',
        canteiroId: 'A',
        temperatura: -3.2,
        umidadeAr: 60,
        umidadeSoloPorcentagem: 55,
        luzSolar: 80,
      },
    ]);

    expect(csv).toContain(',-3.2,');
    expect(csv).not.toContain("'-3.2");
  });

  test('canteiroId normal (sem caractere de fórmula) não é alterado — regressão', () => {
    const csv = gerarCsvLeituras([
      {
        dataHora: '2026-06-14T10:00:00Z',
        canteiroId: 'A',
        temperatura: 22,
        umidadeAr: 60,
        umidadeSoloPorcentagem: 55,
        luzSolar: 80,
      },
    ]);

    // Mantém o contrato já coberto em principalView.test.js (não pode regredir).
    expect(csv).toContain(',A,');
  });
});

describe('sanitizarCelulaCsv (unidade isolada)', () => {
  test.each([
    ['=cmd', "'=cmd"],
    ['+1+1', "'+1+1"],
    ['-cmd', "'-cmd"],
    ['@SUM(A1)', "'@SUM(A1)"],
  ])('prefixa %s com apóstrofo', (entrada, esperado) => {
    expect(sanitizarCelulaCsv(entrada)).toBe(esperado);
  });

  test('não prefixa texto comum', () => {
    expect(sanitizarCelulaCsv('Canteiro Alface')).toBe('Canteiro Alface');
  });

  test('não prefixa string vazia', () => {
    expect(sanitizarCelulaCsv('')).toBe('');
  });

  test('não altera números (incluindo negativos)', () => {
    expect(sanitizarCelulaCsv(25.5)).toBe(25.5);
    expect(sanitizarCelulaCsv(-3.2)).toBe(-3.2);
    expect(sanitizarCelulaCsv(0)).toBe(0);
  });

  test('repassa null/undefined sem lançar erro', () => {
    expect(sanitizarCelulaCsv(null)).toBe(null);
    expect(sanitizarCelulaCsv(undefined)).toBe(undefined);
  });
});
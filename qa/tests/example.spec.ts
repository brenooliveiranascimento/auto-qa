/**
 * Spec de EXEMPLO. Copie para qa/tests/<card-minusculo>.spec.ts para cada card
 * e ajuste URLs, seletores e critérios.
 */
import { test, expect } from '@playwright/test';
import { EvidenceRecorder } from '../lib/evidence';

const CARD = process.env.CARD_ID ?? 'EXEMPLO-001';
const rec = new EvidenceRecorder(CARD);

test.describe(`Regressivo ${CARD}`, () => {
  // Se um teste quebrar antes do print, este hook garante evidência do estado final.
  test.afterEach(async ({ page }, info) => {
    if (info.status !== info.expectedStatus) {
      await rec.shot(page, {
        title: `falha em ${info.title}`,
        status: 'FAIL',
        expected: 'Teste concluir sem erro',
        observed: `Status: ${info.status}. Erro: ${info.error?.message?.split('\n')[0] ?? 'desconhecido'}`,
        criteria: [],
        fullPage: true,
      });
    }
  });

  test('CA-01: página inicial carrega e exibe o título', async ({ page }) => {
    await page.goto('/');

    const title = await page.locator('h1').first().innerText().catch(() => '');
    const ok = title.trim().length > 0;

    await rec.shot(page, {
      title: 'página inicial carregada',
      status: ok ? 'PASS' : 'FAIL',
      expected: 'Título principal visível e não vazio (CA-01)',
      observed: `Título lido: "${title.trim() || '(vazio)'}"`,
      criteria: ['CA-01'],
      highlights: ['h1'],
    });

    expect(ok, 'o título principal deve estar visível').toBe(true);
  });

  test('CA-02: botão principal navega para o fluxo', async ({ page }) => {
    await page.goto('/');

    const button = page.getByRole('button').first();
    const exists = await button.count();

    await rec.shot(page, {
      title: 'botão principal visível',
      status: exists > 0 ? 'PASS' : 'FAIL',
      expected: 'Existe ao menos um botão principal na tela (CA-02)',
      observed: `Botões encontrados: ${exists}`,
      criteria: ['CA-02'],
      highlights: ['button'],
    });

    expect(exists).toBeGreaterThan(0);
  });
});

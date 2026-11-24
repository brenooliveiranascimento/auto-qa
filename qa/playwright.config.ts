import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// Um run = uma pasta em evidence/<CARD>/<RUN_ID>. Definido aqui para que todos os
// workers da mesma execução gravem na mesma pasta.
process.env.QA_RUN_ID ??= new Date().toISOString().replace(/[:.]/g, '-');

if (!process.env.BASE_URL) {
  console.warn('[qa] BASE_URL não definido. Configure qa/.env antes de rodar os testes.');
}

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'results/results.json' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Bahia',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'off', // os prints são feitos por EvidenceRecorder.shot()
    // storageState: '.auth/user.json', // descomente se o app exigir login (gere com um script de login)
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    // { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});

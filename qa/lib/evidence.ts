import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

export type Status = 'PASS' | 'FAIL' | 'BUG' | 'ANOMALIA' | 'INFO' | 'NAO_TESTADO';

export interface ShotOptions {
  /** Título curto do passo (vira o nome do arquivo e o título no relatório). */
  title: string;
  status: Status;
  /** O que deveria acontecer (fonte: CA, RN ou Figma). */
  expected: string;
  /** O que foi visto de fato. Inclua valores lidos da tela. */
  observed: string;
  /** IDs de critérios de aceite relacionados, ex.: ['CA-01']. */
  criteria?: string[];
  /** Seletores CSS a destacar. Cada um recebe um número no print. */
  highlights?: string[];
  /** Print da página inteira (padrão: somente a viewport). */
  fullPage?: boolean;
}

export interface EvidenceEntry {
  n: number;
  title: string;
  status: Status;
  expected: string;
  observed: string;
  criteria: string[];
  highlights: string[];
  /** Caminho do print relativo à pasta do run. */
  file: string;
  url: string;
  at: string;
}

const RUN_ID = process.env.QA_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-');
const EVIDENCE_ROOT = path.resolve(__dirname, '..', '..', 'evidence');

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

/**
 * Grava prints marcados e um manifest.json por execução.
 * Uso: const rec = new EvidenceRecorder('CU-abc123'); await rec.shot(page, {...});
 */
export class EvidenceRecorder {
  readonly cardId: string;
  readonly runDir: string;
  private entries: EvidenceEntry[] = [];
  private counter = 0;

  constructor(cardId: string) {
    this.cardId = cardId;
    this.runDir = path.join(EVIDENCE_ROOT, cardId, RUN_ID);
    fs.mkdirSync(this.runDir, { recursive: true });
    this.flush();
  }

  async shot(page: Page, opts: ShotOptions): Promise<string> {
    this.counter += 1;
    const n = this.counter;
    const file = `${String(n).padStart(2, '0')}-${slugify(opts.title)}.png`;
    const highlights = opts.highlights ?? [];

    if (highlights.length) await this.mark(page, highlights);
    try {
      await page.screenshot({ path: path.join(this.runDir, file), fullPage: opts.fullPage ?? false });
    } finally {
      if (highlights.length) await this.unmark(page);
    }

    this.entries.push({
      n,
      title: opts.title,
      status: opts.status,
      expected: opts.expected,
      observed: opts.observed,
      criteria: opts.criteria ?? [],
      highlights,
      file,
      url: page.url(),
      at: new Date().toISOString(),
    });
    this.flush();
    return path.join(this.runDir, file);
  }

  private async mark(page: Page, selectors: string[]): Promise<void> {
    await page.evaluate((sels: string[]) => {
      sels.forEach((sel, i) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const box = document.createElement('div');
        box.className = '__qa_mark';
        Object.assign(box.style, {
          position: 'absolute',
          left: `${r.left + window.scrollX - 4}px`,
          top: `${r.top + window.scrollY - 4}px`,
          width: `${r.width + 8}px`,
          height: `${r.height + 8}px`,
          border: '3px solid #ff2d55',
          borderRadius: '6px',
          zIndex: '2147483647',
          pointerEvents: 'none',
          boxSizing: 'border-box',
        });
        const tag = document.createElement('div');
        tag.textContent = String(i + 1);
        Object.assign(tag.style, {
          position: 'absolute',
          left: '-3px',
          top: '-22px',
          background: '#ff2d55',
          color: '#fff',
          font: 'bold 14px sans-serif',
          padding: '1px 6px',
          borderRadius: '4px',
        });
        box.appendChild(tag);
        document.body.appendChild(box);
      });
    }, selectors);
  }

  private async unmark(page: Page): Promise<void> {
    await page.evaluate(() => document.querySelectorAll('.__qa_mark').forEach((el) => el.remove()));
  }

  private flush(): void {
    fs.writeFileSync(path.join(this.runDir, 'manifest.json'), JSON.stringify(this.entries, null, 2), 'utf8');
  }
}

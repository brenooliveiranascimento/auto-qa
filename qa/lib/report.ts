/**
 * Gera REPORT.md a partir do manifest.json de uma execução.
 * Uso: npm run report -- <CARD-ID> [RUN_ID]
 * Sem RUN_ID, usa a execução mais recente.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { EvidenceEntry } from './evidence';

const EVIDENCE_ROOT = path.resolve(__dirname, '..', '..', 'evidence');
const [cardId, runArg] = process.argv.slice(2);

if (!cardId) {
  console.error('Uso: npm run report -- <CARD-ID> [RUN_ID]');
  process.exit(1);
}

const cardDir = path.join(EVIDENCE_ROOT, cardId);
if (!fs.existsSync(cardDir)) {
  console.error(`Nenhuma evidência encontrada para ${cardId} em ${cardDir}`);
  process.exit(1);
}

const runs = fs
  .readdirSync(cardDir)
  .filter((d) => fs.existsSync(path.join(cardDir, d, 'manifest.json')))
  .sort();
const run = runArg ?? runs[runs.length - 1];
if (!run) {
  console.error(`Nenhuma execução com manifest.json em ${cardDir}`);
  process.exit(1);
}

const runDir = path.join(cardDir, run);
const entries: EvidenceEntry[] = JSON.parse(fs.readFileSync(path.join(runDir, 'manifest.json'), 'utf8'));

const count = (s: EvidenceEntry['status']) => entries.filter((e) => e.status === s).length;
const failing = count('FAIL') + count('BUG');
const hasCritical = entries.some((e) => e.status === 'FAIL' || e.status === 'BUG');
const hasAnomaly = count('ANOMALIA') > 0 || count('NAO_TESTADO') > 0;

const verdict = hasCritical ? 'REPROVADO' : hasAnomaly ? 'APROVADO COM RESSALVAS' : 'APROVADO';

const allCriteria = [...new Set(entries.flatMap((e) => e.criteria))].sort();
const criteriaRows = allCriteria.map((ca) => {
  const related = entries.filter((e) => e.criteria.includes(ca));
  const status = related.some((e) => e.status === 'FAIL' || e.status === 'BUG')
    ? 'FAIL'
    : related.every((e) => e.status === 'PASS')
      ? 'PASS'
      : 'REVISAR';
  const evid = related.map((e) => `[${String(e.n).padStart(2, '0')}](./${e.file})`).join(', ');
  return `| ${ca} | ${status} | ${evid} |`;
});

const rows = entries.map(
  (e) =>
    `| ${String(e.n).padStart(2, '0')} | ${e.title} | ${e.status} | ${e.criteria.join(', ') || '-'} | [print](./${e.file}) |`,
);

const sections = entries.map((e) => {
  const hl = e.highlights.length
    ? e.highlights.map((h, i) => `${i + 1}. \`${h}\``).join('\n')
    : '_nenhum_';
  return [
    `### ${String(e.n).padStart(2, '0')} — ${e.title}`,
    `- **Status:** ${e.status}`,
    `- **Critérios:** ${e.criteria.join(', ') || '-'}`,
    `- **URL:** ${e.url}`,
    `- **Hora:** ${e.at}`,
    `- **Esperado:** ${e.expected}`,
    `- **Obtido:** ${e.observed}`,
    `- **Marcações:**\n${hl}`,
    '',
    `![${e.title}](./${e.file})`,
    '',
  ].join('\n');
});

const findings = entries.filter((e) => e.status === 'BUG' || e.status === 'FAIL' || e.status === 'ANOMALIA');
const findingRows = findings.map(
  (e) => `| ${String(e.n).padStart(2, '0')} | ${e.status} | ${e.title} | ${e.observed} |`,
);

const md = `# Relatório de execução — ${cardId}

**Veredito automático:** ${verdict}
**Execução:** ${run}
**Total de prints:** ${entries.length}
**PASS:** ${count('PASS')} · **FAIL:** ${count('FAIL')} · **BUG:** ${count('BUG')} · **ANOMALIA:** ${count('ANOMALIA')} · **INFO:** ${count('INFO')} · **NÃO TESTADO:** ${count('NAO_TESTADO')}

> Veredito automático baseado apenas nos status dos prints. A análise completa (regras de negócio, Figma, bugs) está no relatório complementado pelo agente.

## Matriz de critérios de aceite
| CA | Resultado | Evidências |
|---|---|---|
${criteriaRows.join('\n') || '| - | - | - |'}

## Passos executados
| # | Passo | Status | Critérios | Print |
|---|---|---|---|---|
${rows.join('\n')}

## Achados (bugs, falhas e anomalias)
| # | Status | Passo | Obtido |
|---|---|---|---|
${findingRows.join('\n') || '| - | - | Nenhum achado | - |'}

## Detalhe por passo
${sections.join('\n')}
`;

fs.writeFileSync(path.join(runDir, 'REPORT.md'), md, 'utf8');
fs.writeFileSync(path.join(cardDir, 'REPORT.md'), md, 'utf8');
console.log(`Relatório gerado: ${path.join(runDir, 'REPORT.md')}`);
console.log(`Veredito automático: ${verdict}`);

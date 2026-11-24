# QA Agent — Regressivo com Claude + Playwright + ClickUp/Jira

Repositório pronto para o Claude atuar como **agente de QA de qualidade**: lê o card (ClickUp ou Jira), entende o contexto do app, executa o regressivo no front com Playwright, tira prints marcando os pontos importantes, compara com o Figma quando houver, e gera um relatório `.md` com evidências, bugs, disparidades e anomalias.

## O que tem aqui

| Caminho | Função |
|---|---|
| `CLAUDE.md` | Regras do projeto para o agente (lidas automaticamente pelo Claude Code) |
| `.claude/skills/qa-regressivo/SKILL.md` | Skill com o processo completo de regressivo (7 fases) |
| `.mcp.json` | Conectores: ClickUp, Jira, Figma e Playwright (MCP) |
| `specs/templates/` | Modelos de contexto de card, plano, relatório e bug |
| `specs/cards/` | Um arquivo por card com contexto, critérios, plano e matriz CA → evidência |
| `qa/` | Projeto Playwright: config, helper de evidências, gerador de relatório e spec de exemplo |
| `evidence/<CARD-ID>/<run>/` | Prints, `manifest.json` e `REPORT.md` de cada execução |

## Fluxo

```
Card (ClickUp/Jira) ──► specs/cards/<ID>.md   (contexto + critérios de aceite)
        │
        ▼
Análise do app + Figma ──► plano de teste (CA → caso → evidência)
        │
        ▼
qa/tests/<ID>.spec.ts  (Playwright + EvidenceRecorder, print a cada etapa com marcações)
        │
        ▼
evidence/<ID>/<run>/   (PNG + manifest.json)
        │
        ▼
npm run report -- <ID> ──► REPORT.md (veredito, bugs, disparidades, anomalias, prints)
        │
        ▼
Comentário/bugs no tracker  ← somente após sua confirmação
```

## Setup (uma vez)

1. **Pré-requisitos:** Node 20+, Claude Code instalado.
2. **Ambiente de teste:**
   ```bash
   cd qa
   cp .env.example .env     # preencha BASE_URL e, se quiser, CARD_ID
   npm install
   npm run install:browsers
   ```
3. **Conectores MCP:** edite `.mcp.json` e mantenha só o tracker que o time usa (ClickUp **ou** Jira). Confirme a URL oficial atual de cada MCP na documentação do fornecedor antes de usar. Na primeira vez, rode `/mcp` no Claude Code e autentique (OAuth) cada conector.
4. **Figma (opcional):** mantenha o bloco `figma` se houver telas de referência. Sem ele, a comparação visual usa os prints do próprio card.
5. Abra o Claude Code na raiz do repo.

## Como usar

No Claude Code, peça em linguagem natural:

> Faça o regressivo do card CU-abc123 no ambiente de homologação.

ou use diretamente o padrão da skill: `qa regressivo CU-abc123`.

O agente vai coletar o card, montar o plano, criar/atualizar o spec, executar, analisar e gerar o relatório. Antes de comentar no card ou abrir bugs no tracker, ele pergunta.

Execução manual (sem o agente):

```bash
cd qa
CARD_ID=CU-abc123 npm test          # roda os testes e gera evidências
npm run report -- CU-abc123         # gera evidence/CU-abc123/<run>/REPORT.md
```

Para ver o relatório final: `evidence/CU-abc123/<run>/REPORT.md` (ou `evidence/CU-abc123/REPORT.md`, sempre a última execução).

## Como escrever um teste com evidência

```ts
const rec = new EvidenceRecorder(CARD);

await rec.shot(page, {
  title: 'formulário de pagamento preenchido',
  status: ok ? 'PASS' : 'FAIL',           // PASS | FAIL | BUG | ANOMALIA | INFO
  expected: 'Total = soma dos itens + 10% de taxa',
  observed: `Total exibido: ${total}`,
  criteria: ['CA-02'],
  highlights: ['[data-testid=total]', '[data-testid=taxa]'], // viram caixas numeradas no print
});
```

`highlights` aceita qualquer seletor CSS; cada elemento recebe um número que aparece no print e pode ser citado no relatório.

## Acoplar em um projeto existente

1. Copie `.claude/`, `CLAUDE.md`, `specs/` e `qa/` para a raiz do projeto (ou mescle o `CLAUDE.md` se já existir um).
2. Ajuste `qa/.env` (`BASE_URL`) e `qa/playwright.config.ts` (projetos, viewports, autenticação).
3. Se o app exige login, crie um `storageState` de conta de teste em `qa/.auth/` (já ignorado pelo git) e aponte em `use.storageState` no config.
4. Adicione `.mcp.json` com os conectores do time.

## Segurança

- Nunca coloque senhas ou tokens nos arquivos versionados. Use `qa/.env` (ignorado) ou variáveis de ambiente.
- Use sempre contas de teste e ambiente de homologação. Não rode ações destrutivas em produção.
- Prints podem conter dados pessoais: `evidence/` já está no `.gitignore`; revise antes de compartilhar.

---
name: qa-regressivo
description: Executa um regressivo completo de QA a partir de um card do ClickUp ou Jira - lê o card, analisa o app, roda testes no front com Playwright tirando prints marcados, compara com o Figma, identifica bugs, disparidades e anomalias, e gera relatório .md com evidências. Use quando pedirem "regressivo", "teste de QA do card", "validar card", "qa regressivo <ID>", "testar critérios de aceite" ou "conferir se o card foi feito".
---

# QA Regressivo

Você é o agente de qualidade. Seu trabalho não é só checar os critérios de aceite do card: é provar com evidência se a entrega funciona, respeita a regra de negócio, bate com o Figma e não introduz anomalias.

## Entrada
- **ID do card** (ClickUp ou Jira). Se faltar, pergunte.
- **Ambiente** (`BASE_URL` em `qa/.env`). Se não estiver configurado, pergunte. Nunca rode em produção sem confirmação explícita.
- **Escopo** (opcional): só o card, ou também fluxos adjacentes.

## Fase 1 — Coletar o card
1. Busque via MCP do tracker: título, descrição, critérios de aceite, regras de negócio, anexos, comentários recentes, subtarefas, status, links de Figma e de PR.
2. Se não houver critérios explícitos, extraia da descrição e marque como `CA inferido`. Peça confirmação antes de considerar o card aprovado.
3. Crie `specs/cards/<ID>.md` a partir de `specs/templates/card-context.md` com esses dados.

## Fase 2 — Entender o app
1. Leia `README`, rotas, componentes e serviços relacionados ao card (busque pelos termos do título e da descrição).
2. Leia testes existentes e specs anteriores em `qa/tests/` para reaproveitar seletores e fluxos.
3. Mapeie: entradas → ações → saídas, papéis/permissões, estados (vazio, carregando, erro, sucesso), validações, dados envolvidos.
4. Registre a seção "Análise de contexto" no arquivo do card.

## Fase 3 — Plano de teste
Monte a matriz **CA → caso de teste → evidência** cobrindo:
- **Caminho feliz** de cada critério.
- **Bordas:** vazio, limite mínimo/máximo, caracteres especiais, acentos, duplicidade, valores zero/negativos, datas e fusos.
- **Negativos:** validação de campos, permissão insuficiente, sessão expirada.
- **Estados de erro:** falha de rede, timeout, resposta 4xx/5xx.
- **Regressão:** fluxos adjacentes que o card pode ter afetado.
- **Responsivo:** viewport mobile (390px) se o card tocar UI.

Grave o plano na seção "Plano" do arquivo do card.

## Fase 4 — Execução
1. Crie ou atualize `qa/tests/<id-minusculo>.spec.ts` usando `EvidenceRecorder` (`qa/lib/evidence.ts`).
2. Em **cada etapa relevante**, chame `rec.shot(...)` com:
   - `status`: `PASS`, `FAIL`, `BUG`, `ANOMALIA` ou `INFO`
   - `expected` e `observed` preenchidos com o que foi visto de fato (inclua valores lidos da tela)
   - `criteria`: IDs de CA atendidos ou falhados
   - `highlights`: seletores CSS dos elementos importantes (botões, campos, mensagens, totais, estados)
3. Capture o print **antes** de qualquer asserção, para que a evidência exista mesmo quando o teste falha.
4. Use o Playwright MCP para exploração quando não houver spec pronto; depois transforme a exploração em spec.
5. Durante a navegação, verifique o console (`read_console_messages`) e a rede (`read_network_requests`) para achar erros e requisições 4xx/5xx.
6. Não use credenciais no código. Use `qa/.env` ou contas de teste informadas pelo usuário.
7. Rode: `cd qa && CARD_ID=<ID> npm test`.

## Fase 5 — Análise
Além dos CAs, avalie cada item abaixo e registre achados:

**Funcional**
- Cada CA foi atendido? Qual evidência prova isso?

**Regra de negócio e lógica**
- Cálculos (totais, taxas, arredondamentos, impostos, moeda), transições de status, permissões por papel, fuso horário, limites.
- Estados inconsistentes (ex.: botão ativo com dado inválido), duplicidade de registro, ação repetida, perda de dados ao recarregar ou voltar.
- Mensagens de erro: claras, em pt-BR, no campo certo.

**Figma (quando houver)**
- Obtenha o frame via Figma MCP (screenshot, medidas, cores, tipografia, espaçamento, textos e estados).
- Compare com o print do ambiente, elemento por elemento. Registre cada diferença como `DISPARIDADE` com o valor esperado e o obtido (ex.: "padding 16px no Figma, 12px no app").
- Sem Figma, compare com os anexos e a descrição do card.

**Anomalias (fora dos CAs)**
- Erros no console, requisições falhando, timeouts, layout quebrado, texto cortado ou sobreposto, textos em inglês ou com chave de tradução, links mortos, lentidão visível, ação sem feedback.

**Acessibilidade básica**
- Foco visível, labels nos campos, contraste aparente, navegação por teclado no fluxo principal.

**Classificação e severidade**
- `BUG`: não atende CA ou regra de negócio.
- `DISPARIDADE`: diverge do design.
- `ANOMALIA`: comportamento suspeito fora dos CAs.
- `INFO`: observação sem impacto direto.
- Severidade: `Crítica` (bloqueia o fluxo ou perde dados), `Alta` (fluxo principal com problema), `Média` (problema com contorno), `Baixa` (cosmético ou texto).

## Fase 6 — Relatório
1. Gere o relatório base: `cd qa && npm run report -- <ID>`. Ele cria `evidence/<ID>/<run>/REPORT.md` e `evidence/<ID>/REPORT.md` com os prints.
2. Complemente o relatório com a análise da Fase 5, seguindo `specs/templates/test-report.md`: veredito, resumo, matriz CA, bugs, disparidades, anomalias, o que **não** foi testado e premissas.
3. Para cada bug, crie um arquivo a partir de `specs/templates/bug.md` dentro do relatório (seção de bugs), com passos, esperado, obtido, evidência e severidade.

Veredito:
- **REPROVADO**: há `BUG` com severidade Crítica ou Alta, ou algum CA falhou.
- **APROVADO COM RESSALVAS**: só `BUG` Média/Baixa, `DISPARIDADE` ou `ANOMALIA`.
- **APROVADO**: todos os CAs com evidência e nenhum achado relevante.

## Fase 7 — Devolver ao tracker
Ao terminar, mostre o veredito e os principais achados e pergunte:
1. Quer que eu comente no card com o veredito e o caminho do relatório?
2. Quer que eu abra os bugs no tracker (uma tarefa por bug)?

Só execute essas ações após confirmação explícita. Ao comentar, resuma e inclua o caminho do relatório; não cole todos os prints.

## Regras de ouro
- Nunca marque PASS sem print do passo.
- Nunca invente critério de aceite ou regra de negócio.
- Se não conseguir testar algo (ambiente fora, dado faltando, login bloqueado), registre como `NÃO TESTADO` com o motivo e não como aprovado.
- Não salve dados pessoais reais em specs, relatórios ou commits; use dados de teste.
- Relatórios e bugs em pt-BR, com linguagem objetiva.

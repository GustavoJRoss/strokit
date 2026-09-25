# KICKOFF — prompts para o Claude Code

## 1. Primeira sessão (planejamento, sem código)

Cole isto no Claude Code na raiz do repositório vazio (com `CLAUDE.md` e `docs/` já copiados):

```
Leia CLAUDE.md e todos os arquivos em docs/. Ainda NÃO escreva código.

Quero que você:
1. Aponte ambiguidades, contradições ou riscos que encontrar na SPEC e na ARCHITECTURE.
2. Confirme as versões estáveis atuais de Next.js, React, Tailwind, shadcn, Zod, Zustand,
   Vitest, Playwright, Biome e motion, e diga se alguma decisão da ARCHITECTURE fica
   desatualizada por causa disso.
3. Proponha o plano detalhado da Fase 0 e da Fase 1: lista de arquivos a criar, ordem de
   execução e os testes que vai escrever primeiro.

Termine com as perguntas que precisa que eu responda antes de começar.
```

## 2. Executar uma fase

```
Execute a Fase N do docs/ROADMAP.md seguindo o CLAUDE.md.
Antes de codar, escreva o plano curto da fase e siga-o.
Ao terminar: rode lint, typecheck e test, marque os checkboxes da fase no ROADMAP
e me mostre um resumo do que foi feito, o que ficou pendente e qualquer decisão
que precise entrar no log de ARCHITECTURE §12. Pare aí.
```

## 3. Quando algo sair do plano

```
Pare. Explique qual premissa da ARCHITECTURE não se sustentou, quais são as opções,
qual você recomenda e o impacto nas próximas fases. Não implemente até eu aprovar.
```

## 4. Revisão antes do lançamento

```
Faça uma revisão crítica do projeto como se fosse um staff engineer avaliando um portfólio:
segurança da sanitização de SVG, qualidade do código exportado, cobertura de testes,
acessibilidade, performance da landing e clareza do README. Liste os problemas por severidade.
```

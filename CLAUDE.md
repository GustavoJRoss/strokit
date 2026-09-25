# CLAUDE.md — strokekit

> Nome provisório. Troque "strokekit" em todos os arquivos quando definir o nome final.

## O que é

Ferramenta web **code-first** para devs React criarem animações de logo e telas de carregamento a partir de um SVG. O usuário arrasta a logo, escolhe um preset (desenhar, cometa, vai-e-vem, stagger, desenhar-e-preencher…), ajusta parâmetros com sliders e **exporta código pronto**: CSS puro, componente React tipado ou componente Motion.

Diferencial: não é uma timeline genérica para designers. É uma ferramenta que gera **código limpo, sem runtime, que respeita tokens do tema e `prefers-reduced-motion`**, distribuível via registry do shadcn.

## Documentos (leia antes de qualquer tarefa)

- `docs/SPEC.md` — escopo do produto, presets, requisitos, fora de escopo
- `docs/ARCHITECTURE.md` — estrutura do monorepo, modelo de dados, pipeline, decisões técnicas
- `docs/ROADMAP.md` — fases, tarefas e critérios de aceite
- `docs/KICKOFF.md` — prompt de início de sessão

## Stack

- **pnpm workspaces** (monorepo), Node LTS
- `packages/core` — TypeScript puro, **zero dependência de React/DOM de framework**
- `apps/web` — Next.js (App Router), React 19, Tailwind CSS v4, shadcn/ui (Radix), Zustand
- Validação: Zod
- Testes: Vitest (core e web), Playwright (e2e smoke)
- Lint/format: Biome
- Use as versões estáveis atuais de cada lib; confirme antes de instalar.

## Comandos

```bash
pnpm install
pnpm dev            # apps/web em modo dev
pnpm test           # vitest em todos os pacotes
pnpm test:e2e       # playwright
pnpm lint           # biome check
pnpm typecheck      # tsc --noEmit em todos os pacotes
pnpm build
```

## Regras invioláveis

1. **`AnimationSpec` é a única fonte da verdade.** Preview, exportadores e URL de compartilhamento derivam dela. Nunca guarde estado de animação fora dela.
2. **Preview = export.** O preview do editor renderiza exatamente o CSS gerado pelo exportador de CSS. Não existe um "caminho de preview" separado. Isso garante WYSIWYG.
3. **`packages/core` não importa React, Next ou Zustand.** Funções puras, testáveis em Node. A única exceção de ambiente é o que for explicitamente isolado em `core/src/dom/` (medição de paths), com fallback testável.
4. **Nunca injete SVG do usuário sem sanitizar.** Todo SVG passa por `sanitizeSvg()` antes de ir para o DOM: remover `<script>`, `<foreignObject>`, atributos `on*`, `href`/`xlink:href` com `javascript:`, e referências externas.
5. **Todo exportador tem teste de snapshot.** Mudou a saída? Atualize o snapshot conscientemente e explique no commit.
6. **Todo código exportado inclui `@media (prefers-reduced-motion: reduce)`.**
7. **Cores exportadas usam CSS custom properties com fallback** (`var(--sk-stroke, currentColor)`), nunca hex fixo, exceto se o usuário escolher explicitamente.
8. Tipagem estrita (`strict: true`, sem `any` implícito). Sem `// @ts-ignore` sem comentário justificando.

## Forma de trabalhar

- Trabalhe **uma fase do ROADMAP por vez**. Ao terminar uma fase: rode `lint`, `typecheck` e `test`, marque os checkboxes no ROADMAP e **pare para revisão** antes da próxima fase.
- Antes de codar uma fase, escreva um plano curto (arquivos a criar/alterar, riscos) e siga-o.
- Commits pequenos, no formato Conventional Commits (`feat(core): preset comet`).
- Se uma decisão da ARCHITECTURE se mostrar errada na prática, **não contorne em silêncio**: proponha a mudança, atualize o documento e registre em "Decisões" no fim de `docs/ARCHITECTURE.md`.
- Não adicione dependências fora da stack sem justificar.

## Convenções

- Código, nomes e commits em inglês; documentação e textos de UI em português (i18n fica fora do MVP).
- Arquivos em kebab-case; componentes React em PascalCase.
- Presets vivem em `packages/core/src/presets/<nome>.ts`, um por arquivo, todos registrados em `presets/index.ts`.

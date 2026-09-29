# strokit

[![CI](https://github.com/GustavoJRoss/strokit/actions/workflows/ci.yml/badge.svg)](https://github.com/GustavoJRoss/strokit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Ferramenta web **code-first** para devs React criarem animações de logo e telas de carregamento a partir de um SVG: arraste a logo, escolha um preset (desenhar-e-preencher, cometa, vai-e-vem, formigas marchando, pulsar), ajuste com sliders vendo o resultado ao vivo e exporte **código pronto** — CSS puro, componente React tipado ou componente Motion. Sem runtime, respeitando tokens do tema e `prefers-reduced-motion`.

O porquê do projeto e o problema que ele resolve estão em [`docs/SPEC.md`](docs/SPEC.md).

## Stack

Monorepo com `npm` workspaces, Node 24. `packages/core` é TypeScript puro (sem React/Next); `apps/web` é o editor e a landing, em Next.js + React 19 + Tailwind v4 + shadcn/ui + Zustand. Detalhes e decisões técnicas em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Rodando localmente

```bash
npm install
npm run dev            # apps/web em modo dev
npm test               # vitest em todos os pacotes
npm run test:e2e       # playwright
npm run lint           # biome check
npm run typecheck
npm run build
```

## Documentação

- [`docs/SPEC.md`](docs/SPEC.md) — escopo, presets, requisitos
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — estrutura do monorepo, modelo de dados, pipeline, decisões
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — fases e critérios de aceite
- [`CLAUDE.md`](CLAUDE.md) — regras e forma de trabalhar no projeto

## Open source

O projeto é distribuído sob a licença **[MIT](LICENSE)**: qualquer pessoa pode usar, copiar, modificar e redistribuir o código, inclusive comercialmente, desde que mantenha o aviso de copyright. Isso vale tanto pro editor (`apps/web`) quanto pro `@strokit/core` — a intenção é que o core também sirva de base pra quem quiser gerar animações de SVG fora do editor (por exemplo via [registry do shadcn](docs/ROADMAP.md), ainda não publicado).

**Status:** é um projeto pessoal/de portfólio em desenvolvimento ativo (ver [`docs/ROADMAP.md`](docs/ROADMAP.md) pras fases já entregues e o que falta). A API do `@strokit/core` e o formato da `AnimationSpec` ainda podem mudar antes de uma v1.0; specs e projetos `.strokit.json` salvos passam por `migrate()`, então mudanças de formato não deveriam quebrar o que já foi salvo.

**Contribuindo:** o fluxo de trabalho do projeto está descrito no [`CLAUDE.md`](CLAUDE.md) — uma fase do roadmap por vez, `lint`/`typecheck`/`test` verdes antes de qualquer PR, commits no formato [Conventional Commits](https://www.conventionalcommits.org/) (`feat(core): preset comet`). Bugs e sugestões são bem-vindos como [issues](https://github.com/GustavoJRoss/strokit/issues); antes de um PR maior, abra uma issue descrevendo a mudança para alinhar o escopo.

Nenhum SVG ou dado do usuário sai do navegador — o editor roda inteiramente no cliente, sem conta e sem backend.

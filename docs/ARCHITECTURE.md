# ARCHITECTURE — strokit

## 1. Por que Next.js (e não Vite/Astro)

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| **Next.js (App Router)** | Landing com SSR e OG image (importa para o link no LinkedIn), o template oficial de registry do shadcn é Next, rotas estáticas para `/r/*.json`, é a stack que o autor domina | O editor é 100% client, então parte do framework fica ociosa | **Escolhido** |
| Vite + React SPA | Mais simples, build rápido | Landing sem SSR, OG images e registry precisam de solução à parte | Bom, mas perde vitrine |
| Astro + React island | Landing excelente | Editor pesado vira uma ilha grande; dois modelos mentais | Desnecessário |

O editor roda como Client Component (`"use client"`) carregado com `dynamic(..., { ssr: false })`. O site pode ser **static export** (`output: "export"`), então funciona na Vercel ou na VPS com qualquer servidor estático.

## 2. Estrutura do monorepo

```
strokit/
├─ CLAUDE.md
├─ docs/
├─ package.json            # scripts raiz
├─ pnpm-workspace.yaml
├─ biome.json
├─ tsconfig.base.json
├─ packages/
│  └─ core/
│     ├─ src/
│     │  ├─ spec/           # schema Zod da AnimationSpec + tipos
│     │  ├─ svg/            # parse, sanitize, normalize (string → SvgDocument)
│     │  ├─ dom/            # medição de paths (isolado, com fallback)
│     │  ├─ presets/        # um arquivo por preset + index
│     │  ├─ compile/        # AnimationSpec + SvgDocument → CompiledAnimation
│     │  ├─ exporters/      # css.ts, react.ts, motion.ts
│     │  ├─ share/          # encode/decode de URL
│     │  └─ index.ts        # API pública
│     └─ test/
│        ├─ fixtures/       # SVGs de teste (incluindo maliciosos)
│        └─ __snapshots__/
└─ apps/
   └─ web/
      ├─ app/
      │  ├─ page.tsx        # landing
      │  ├─ editor/page.tsx # editor
      │  └─ r/              # registry do shadcn (gerado no build)
      ├─ components/
      │  ├─ editor/         # Canvas, LayersPanel, PresetPicker, ParamsPanel, ExportPanel, Toolbar
      │  └─ ui/             # shadcn
      ├─ registry/          # fontes dos itens publicados no registry
      ├─ store/             # Zustand
      └─ e2e/               # Playwright
```

## 3. Modelo de dados

### SvgDocument (saída do import)

```ts
type SvgDocument = {
  viewBox: [number, number, number, number];
  width?: number;
  height?: number;
  elements: DrawableElement[];
  root: SvgElementNode;      // árvore JSON sanitizada e normalizada, drawables com data-sk-id
  raw: string;               // root serializado (serializador próprio, determinístico)
};

type SvgElementNode = { type: "element"; name: string; attrs: Record<string, string>; children: SvgNode[] };
type SvgNode = SvgElementNode | { type: "text"; value: string };

type DrawableElement = {
  id: string;                // "sk-0", "sk-1"… estável pela ordem no documento
  tag: "path" | "line" | "polyline" | "polygon" | "rect" | "circle" | "ellipse";
  hasFill: boolean;
  hasStroke: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  length?: number;           // preenchido pela medição, se disponível
};
```

### AnimationSpec (fonte da verdade)

```ts
type AnimationSpec = {
  version: 1;
  name: string;
  global: {
    autoStroke: { enabled: boolean; width: number };   // RF4
    a11y: { label: string; mode: "img" | "status" };
  };
  tracks: Track[];
};

type Track = {
  id: string;
  targets: string[];         // ids de DrawableElement
  preset: PresetId;
  params: PresetParams;      // união discriminada por preset, validada por Zod
  timing: {
    duration: number;
    delay: number;
    easing: EasingPreset | { cubicBezier: [number, number, number, number] };
    iterations: number | "infinite";
    direction: "normal" | "reverse" | "alternate" | "alternate-reverse";
  };
};
```

Todo schema tem `version`. A decodificação de URL e de `.strokit.json` passa por `migrate()` antes da validação, para que links antigos continuem funcionando.

## 4. Pipeline

```
SVG string
  → parseSvg()           DOMParser injetado (browser) / linkedom (testes) → árvore JSON inerte
  → inlineStyles()       <style> e style="" viram atributos de apresentação
  → sanitizeTree()       allowlist de elementos/atributos (sanitizeSvg() = tudo isso + serialize)
  → normalizeSvg()       ids estáveis, detecta drawables, lê fill/stroke herdados, garante viewBox
  → measure() [opcional] getTotalLength, só no browser
  = SvgDocument          (importSvg() executa o pipeline inteiro)

SvgDocument + AnimationSpec
  → compile()            aplica presets → CompiledAnimation
     { id: "sk-<hash>", root: SvgElementNode, keyframes, rules, a11y, warnings }
  → exporters.css()      string CSS + SVG com <style> embutido
  → exporters.react()    string TSX
  → exporters.motion()   string TSX usando motion/react
```

`CompiledAnimation` é uma representação intermediária neutra: os três exportadores leem dela e nenhum deles conhece presets. Assim, adicionar um preset nunca exige tocar nos exportadores, e adicionar um exportador nunca exige tocar nos presets.

### Contrato de preset

```ts
interface Preset<P> {
  id: PresetId;
  label: string;
  paramsSchema: z.ZodType<P>;
  defaults: { params: P; timing: Partial<Track["timing"]> };
  requiresStroke: boolean;   // se true e o elemento só tem fill → usa autoStroke ou avisa
  autoStrokeFill?: "keep" | "ghost"; // "ghost": fill a 0.2 quando o traço vem do autoStroke
  compile(ctx: {
    element: DrawableElement;
    index: number;           // posição dentro do track (para stagger)
    total: number;
    params: P;
    timing: Track["timing"];
  }): { keyframes: Keyframe[]; rule: ElementRule };
}
```

### Preview

O editor chama `compile()` e depois `exporters.css(compiled, { includeElementIds: true })`, e injeta o resultado num **Shadow DOM** (decidido na Fase 2). O CSS é idêntico ao exportado; a única diferença no markup são os `data-sk-id`, usados para hover e seleção. Isso cumpre a regra "preview = export" e evita que o CSS da animação vaze para a UI do editor. Controles de play/pause/velocidade usam a Web Animations API (`shadowRoot.getAnimations()`) sobre as animações CSS já aplicadas, sem gerar outro código.

**Simular reduced motion:** o preview troca, via CSSOM, o `media` da regra `@media (prefers-reduced-motion: reduce)` do próprio stylesheet exportado para `all` (e de volta). O texto do CSS nunca é reescrito.

**Hover/seleção:** um overlay HTML fora do Shadow DOM desenha o `getBoundingClientRect()` dos elementos; clicar no canvas seleciona (`composedPath()` até o `data-sk-id`).

## 5. Segurança (sanitização)

SVG é um vetor de XSS. `sanitizeSvg()` usa allowlist (não blocklist):

- elementos permitidos: `svg`, `g`, `defs`, `path`, `line`, `polyline`, `polygon`, `rect`, `circle`, `ellipse`, `linearGradient`, `radialGradient`, `stop`, `clipPath`, `mask`, `use` (apenas `href` interno `#id`), `title`, `desc`;
- remove: `script`, `foreignObject`, `style` externo com `@import`, `image` com URL externa, todo atributo `on*`, `href` e `xlink:href` que não comecem com `#`, `url()` apontando para fora do documento;
- fixtures maliciosas em `core/test/fixtures/malicious/` com testes dedicados.

Avaliar DOMPurify com perfil SVG como implementação. Se usado, os testes continuam valendo como contrato.

## 6. Decisão técnica central: `pathLength="1"`

Definir `pathLength="1"` em cada elemento animado faz `stroke-dasharray` e `stroke-dashoffset` operarem na faixa 0–1, independente do comprimento real. Isso:

- elimina medição com `getTotalLength()` para gerar código;
- torna o CSS exportado **independente de escala e responsivo**;
- deixa os presets triviais (`draw`: `dasharray: 1 1; dashoffset 1 → 0`).

**Resultado do spike (Fase 1):** `e2e/path-length.spec.ts` mede a "tinta" de `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon` e `path` em t=0, 50% e 100% do `draw`. Passa em Chromium, Firefox e WebKit (Playwright). O mesmo teste falha se o `pathLength` for removido, ou seja, ele detecta o problema. **Não é preciso converter formas em `<path>`.** Falta só a confirmação manual no Safari real (galeria em `apps/web/e2e/.spike/index.html`).

**Risco (original):** historicamente o Safari teve inconsistências com `pathLength` em alguns elementos básicos (`rect`, `circle`). Na Fase 1, validar em Safari real. Plano B: converter formas básicas em `<path>` na normalização e/ou usar `length` medido para emitir valores absolutos. O `DrawableElement.length` já existe para isso.

## 7. Exportadores

**CSS:** um SVG com `<style>` embutido. Classes com prefixo único por export (`sk-<hash>`) para não colidir quando houver várias logos na página. Cores como `var(--sk-stroke, <cor original>)`. Sempre inclui o bloco de reduced motion, que mostra o estado final estático.

**React (TSX):**

```tsx
type Props = {
  size?: number | string;
  speed?: number;          // multiplicador de duração
  loop?: boolean;
  paused?: boolean;
  className?: string;
  label?: string;
};
```

Sem dependências; CSS em `<style>` escopado pelo prefixo. O CSS é o mesmo do export CSS, mas o timing lê custom properties: duração e atraso viram `calc(Xms / var(--sk-speed, 1))`, as repetições `var(--sk-iterations, N)` e `animation-play-state: var(--sk-play-state, running)`. Assim `speed`, `loop` e `paused` mudam a reprodução sem re-render do SVG. Com `a11y.mode = "status"`, o SVG fica `aria-hidden` dentro de um `<span role="status">` com texto visualmente oculto.

**Motion:** o mesmo contrato de props e o mesmo markup (elementos SVG comuns com classes), animados por `useAnimate()` do `motion/react`. Os keyframes da IR viram arrays de valores + `times` (com `ease`, `repeat` e `repeatType` equivalentes); o CSS guarda as propriedades estáticas, o **primeiro keyframe** (nada pisca antes da hidratação) e o bloco de reduced motion; `useReducedMotion()` desliga as animações. `speed` e `paused` usam os controles de playback (`control.speed`, `pause()`/`play()`), sem reiniciar. Útil para quem já tem Motion no projeto. O preview do editor continua sendo a versão CSS (a aba avisa).

## 8. Estado do editor (Zustand)

```ts
type EditorState = {
  doc: SvgDocument | null;
  fileName: string | null;
  importWarnings: ImportWarning[];
  spec: AnimationSpec;
  selection: string[];
  selectionAnchor: string | null;   // para seleção por intervalo (Shift)
  hovered: string | null;
  playback: {                        // estado só do preview, nunca exportado
    playing: boolean;
    rate: number;
    reducedMotion: boolean;
    background: "light" | "dark" | "checker";
    restartToken: number;
  };
  exportTab: "css" | "react" | "motion";
  exportOpen: boolean;
};
```

Derivados (`selectCompiled`, `selectCssExport`, `selectPreviewMarkup`, `selectActiveTrack`) são seletores memoizados pela identidade das entradas (`memoizeLast`) e **não** ficam guardados no store: todos os componentes compartilham um único compile por mudança de spec. Undo/redo com `zundo` na Fase 5 (opcional). Sincronização com a URL feita com debounce de 300 ms.

## 9. Compartilhamento por URL

`encodeShare({ svg, spec })` → JSON → compressão (`lz-string` `compressToEncodedURIComponent`) → hash `#s=...`. O `svg` é o `SvgDocument.raw` (já sanitizado); ao abrir, ele passa de novo por `importSvg()` e a spec por `migrate()` + Zod. O editor sincroniza o hash com debounce de 300 ms (`history.replaceState`). Limite prático de 8000 caracteres (`SHARE_URL_LIMIT`); acima disso, "Copiar link" oferece baixar o `.strokit.json` (`{ format: "strokit", version: 1, svg, spec }`). O hash não é enviado ao servidor, o que mantém a privacidade.

## 10. Registry do shadcn

Publicar primitivos reutilizáveis independentes do editor:

- `stroke-draw` — componente que desenha qualquer SVG filho;
- `stroke-comet` — cometa/yoyo;
- `logo-loader` — wrapper com `role="status"` e reduced motion.

Build com `shadcn build`, saída em `apps/web/public/r/`. Instalação: `npx shadcn add https://<dominio>/r/stroke-draw.json`.

## 11. Testes

- **core/unit:** cada preset (keyframes e regras), sanitização (fixtures malignas), normalização (formas básicas, transforms, viewBox), encode/decode de URL com round-trip.
- **core/snapshot:** cada exportador × cada preset sobre 2 fixtures.
- **web/unit:** seletores do store e sincronização com a URL.
- **e2e (Playwright):** importar fixture → aplicar `yoyo` → trocar para aba React → copiar → verificar que o texto contém `export function`; abrir URL compartilhada e verificar o estado.

## 12. Decisões (log)

| Data | Decisão | Motivo |
|---|---|---|
| — | Next.js + static export | Vitrine (SSR/OG) + registry, sem custo de servidor |
| — | `pathLength="1"` como base dos presets | Código independente de escala; presets simples |
| — | IR `CompiledAnimation` entre presets e exportadores | Desacopla N presets de M exportadores |
| — | Preview = export CSS | WYSIWYG garantido |
| 2026-09-25 | Docs movidos de `strokekit-plan/docs/` para `docs/` | O CLAUDE.md referencia `docs/` |
| 2026-09-25 | Versões fixadas: Next 16.3, React 19.3, Tailwind 4.3, shadcn 4.21 (base Radix, preset Nova), Zod 4, Zustand 5, Vitest 5, Playwright 1.63, Biome 2.5, TypeScript 7.0, pnpm 12.6, Node 24 | Versões estáveis em 25/09/2026. TS 7 validado com `next build`, `next typegen` e Vitest na Fase 0 |
| 2026-09-25 | `<style>` e `style=""` do SVG: seletores simples (`.classe`, `#id`, `tag`, listas com vírgula) resolvidos em atributos de apresentação na normalização; o `<style>` é descartado | Logos do Illustrator/Figma definem cores por classe; a allowlist apagaria as cores |
| 2026-09-25 | Sanitizer próprio com allowlist sobre um `DOMParser` injetado (`window.DOMParser` no browser, `linkedom` nos testes); sem DOMPurify | Core continua puro, sem dependência de runtime; os testes são o contrato |
| 2026-09-25 | Um elemento pertence a no máximo um track; aplicar preset move os alvos e remove tracks vazios | Evita duas animações CSS disputando a mesma propriedade |
| 2026-09-25 | Prefixo `sk-<hash>` = FNV-1a de `svg.raw + JSON(spec)` | Snapshots determinísticos |
| 2026-09-25 | `packages/core` é consumido como fonte TS (`exports: ./src/index.ts` + `transpilePackages`) | Sem etapa de build intermediária no monorepo |
| 2026-09-25 | E2E roda contra o static export (`next build` + `serve out`) em Chromium, Firefox e WebKit | Testa o artefato que vai para produção; WebKit cobre o risco do Safari |
| 2026-09-25 | Dependências extras de dev: `@vitest/coverage-v8` (meta de 80%), `serve` (servidor estático do e2e), `jsdom` + Testing Library (testes do web) | Necessárias para os critérios de aceite |
| 2026-09-25 | O `DOMParser` injetado só faz o parse; o resultado vira uma árvore JSON pura (`SvgElementNode`). Inline de estilos, sanitização, normalização, compile e serialização trabalham sobre ela | `XMLSerializer` e linkedom serializam diferente; com serializador próprio, preview, export e snapshots são idênticos em Node e browser |
| 2026-09-25 | `SvgDocument` ganha `root` (árvore) além de `raw`; `CompiledAnimation` carrega `root` em vez de `svg: string` | O compile aplica atributos (`pathLength`) sem precisar de DOM, e os exportadores React/Motion vão percorrer a árvore |
| 2026-09-25 | Ordem do pipeline: parse → inlineStyles → sanitize → normalize | A sanitização roda por último sobre o que o inline de estilos produziu, então nada que venha do CSS escapa da allowlist |
| 2026-09-25 | DOCTYPE/ENTITY rejeitados antes do parse; `xlink:href` reescrito como `href`; `<a>` e `<switch>` desembrulhados (filhos mantidos); `x`/`y`/`version` removidos da raiz | Segurança (entity expansion) e export mais limpo |
| 2026-09-25 | `Preset.defaults.timing` é um `Timing` completo (não `Partial`) | Não existe timing global para completar; cada preset define o seu |
| 2026-09-25 | Cor animada via `stroke: var(--sk-stroke, <cor original>)` é aplicada pelo `compile()`, não pelo preset; auto-stroke usa a cor do fill | Presets ficam sem lógica de cor; RF4 e regra 7 em um só lugar |
| 2026-09-25 | Export CSS agrupa elementos com regra idêntica em uma classe `sk-<hash>-N`; `data-sk-id` é removido do export (mantido com `includeElementIds` para o preview, sem mudar o CSS) | CSS curto; o preview continua usando exatamente o mesmo CSS |
| 2026-09-25 | Spike do `pathLength` virou teste e2e permanente nos 3 motores | Garante que regressões de navegador sejam detectadas |
| 2026-09-25 | `global.playbackRate` e `global.background` saíram da `AnimationSpec` e foram para `playback` no store | São estado do preview; duplicavam o store (regra 1) |
| 2026-09-25 | Preview em Shadow DOM; reduced motion simulado trocando o `media` da regra via CSSOM | O texto do CSS continua idêntico ao exportado, sem nenhuma derivação textual |
| 2026-09-25 | Destaque de sintaxe: Shiki carregado sob demanda, engine JS (sem WASM), tema github-light; o `<style>` do SVG é destacado como CSS em segmento próprio | A gramática HTML do Shiki não trata `<style>` dentro de `<svg>` como CSS |
| 2026-09-25 | `exactOptionalPropertyTypes` desligado só em `apps/web` | Componentes shadcn/Radix não são escritos para essa flag; o core continua com ela |
| 2026-09-25 | shadcn `slider.tsx` alterado para repassar `aria-label` ao thumb | O Radix nomeia o thumb, não o root; sem isso os sliders ficam sem nome acessível |
| 2026-09-25 | Ao importar, todas as camadas recebem `draw`; o auto-stroke é ligado quando alguma camada só tem preenchimento | O usuário vê a animação imediatamente, inclusive em logos só com fill (RF4) |
| 2026-09-25 | ParamsPanel gera os controles dos params via `describeParams()` (core), lendo `z.number/enum/boolean` e `.meta({ label, step, unit })` | Adicionar preset não exige tocar na UI |
| 2026-09-25 | `yoyo` usa `dasharray: L 1` e `dashoffset: 0 → L-1` com `alternate`, em vez de `comet` + `alternate` | O padrão `L (1-L)` repete e "dá a volta" em paths abertos; `L 1` mantém o risco dentro do contorno, que é o efeito "vai e volta" pedido |
| 2026-09-25 | `stagger-draw`: `animation-delay` quando `iterations = 1`; com repetição, keyframes por elemento dentro de um ciclo comum `duration + (n-1)·step` | `animation-delay` só atrasa a 1ª iteração e o loop dessincroniza (pendência da Fase 1 resolvida) |
| 2026-09-25 | Ordem aleatória do stagger: permutação Fisher–Yates com mulberry32 semeado (`util/random.ts`) | Determinística em qualquer ambiente; o mesmo link sempre gera o mesmo código |
| 2026-09-25 | `march` reescala traço/espaço para caber um número inteiro de repetições em `pathLength = 1` | Emenda invisível em formas fechadas |
| 2026-09-25 | Presets que animam `transform` (`pulse`): o `compile()` move o `transform` SVG do elemento para um `<g>` pai | `transform` em CSS substitui o atributo em vez de compor; sem isso a logo "pula" |
| 2026-09-25 | `comet`, `yoyo` e `march` declaram `autoStrokeFill: "ghost"`: com traço automático, o fill fica a 0.2 (1 em reduced motion) | O traço automático tem a cor do fill; sem esmaecer, o risco em movimento fica invisível sobre o próprio preenchimento |
| 2026-09-25 | Exportador CSS omite regras vazias no bloco de reduced motion | `march` mantém o tracejado estático e não precisa de propriedades extras |
| 2026-09-25 | Editor de easing: presets CSS + "Personalizado" com curva arrastável (mouse e setas; Shift = passo 0.1), y em [-0.5, 1.5] para overshoot | SPEC: cubic-bezier customizado com curva visual |
| 2026-09-25 | Export Motion com `useAnimate()` sobre o mesmo markup do React, em vez de `motion.path` com `pathLength` animado | Mantém "exportadores não conhecem presets": os keyframes da IR são traduzidos genericamente; `pathLength` do Motion exigiria mapear cada preset |
| 2026-09-25 | Export React: timing via `--sk-speed`, `--sk-iterations`, `--sk-play-state` | Props mudam a reprodução sem re-render (ARCHITECTURE §7) |
| 2026-09-25 | O hash `sk-<hash>` usa JSON canônico (chaves ordenadas) da spec | Uma spec restaurada de link/arquivo volta com as chaves na ordem do schema; sem isso o prefixo mudava e o código exportado deixava de ser idêntico |
| 2026-09-25 | Teste que roda `tsc` (strict, `exactOptionalPropertyTypes`) em 56 arquivos gerados; `react`, `@types/react` e `motion` são devDependencies do core só para ele | Critério da Fase 4: o TSX exportado compila com os tipos reais |
| 2026-09-25 | Página `/exemplos` com 4 componentes gerados pelos exportadores; um teste falha se eles ficarem desatualizados (`UPDATE_GENERATED=1` regenera) | Prova que o TSX roda num app Next (compilado pelo `next build`, verificado por e2e) |
| 2026-09-25 | `lz-string` importado como default | É CommonJS; o default import é a forma aceita tanto pelo Node ESM (Playwright) quanto pelos bundlers |
| 2026-09-25 | Projetos são reconhecidos pela extensão `.json` ou por conteúdo começando com `{` | Downloads podem perder a extensão |
| 2026-09-25 | Nome definitivo do projeto: **strokit** (pacotes `@strokit/core` e `@strokit/web`, arquivo de projeto `.strokit.json`, `format: "strokit"`) | Decisão do autor. O prefixo `sk-` das classes e as variáveis `--sk-*` ficam: continuam sendo a sigla do nome e mudá-los quebraria o CSS de quem já exportou |

### Pendências abertas (decidir até a fase indicada)

- **Fase 5:** com static export a OG image é gerada no build; não há OG por animação compartilhada (o hash não chega ao servidor).

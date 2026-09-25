# ARCHITECTURE — strokekit

## 1. Por que Next.js (e não Vite/Astro)

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| **Next.js (App Router)** | Landing com SSR e OG image (importa para o link no LinkedIn), o template oficial de registry do shadcn é Next, rotas estáticas para `/r/*.json`, é a stack que o autor domina | O editor é 100% client, então parte do framework fica ociosa | **Escolhido** |
| Vite + React SPA | Mais simples, build rápido | Landing sem SSR, OG images e registry precisam de solução à parte | Bom, mas perde vitrine |
| Astro + React island | Landing excelente | Editor pesado vira uma ilha grande; dois modelos mentais | Desnecessário |

O editor roda como Client Component (`"use client"`) carregado com `dynamic(..., { ssr: false })`. O site pode ser **static export** (`output: "export"`), então funciona na Vercel ou na VPS com qualquer servidor estático.

## 2. Estrutura do monorepo

```
strokekit/
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
  raw: string;               // markup sanitizado e normalizado, com data-sk-id
};

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
    playbackRate: number;
    background: "light" | "dark" | "checker";
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

Todo schema tem `version`. A decodificação de URL e de `.strokekit.json` passa por `migrate()` antes da validação, para que links antigos continuem funcionando.

## 4. Pipeline

```
SVG string
  → sanitizeSvg()        remove conteúdo perigoso
  → parseSvg()           DOMParser (browser) / linkedom (testes)
  → normalizeSvg()       ids estáveis, detecta drawables, lê fill/stroke
  → measure() [opcional] getTotalLength, só no browser
  = SvgDocument

SvgDocument + AnimationSpec
  → compile()            aplica presets → CompiledAnimation
     { keyframes: Keyframe[], rules: ElementRule[], svg: string }
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

O editor chama `compile()` e depois `exporters.css()`, e injeta o resultado dentro de um container isolado (Shadow DOM ou `<iframe srcdoc>`, a decidir na Fase 2, preferindo Shadow DOM). Isso cumpre a regra "preview = export" e evita que o CSS da animação vaze para a UI do editor. Controles de play/pause/velocidade usam a Web Animations API (`element.getAnimations()`) sobre as animações CSS já aplicadas, sem gerar outro código.

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

**Risco:** historicamente o Safari teve inconsistências com `pathLength` em alguns elementos básicos (`rect`, `circle`). Na Fase 1, validar em Safari real. Plano B: converter formas básicas em `<path>` na normalização e/ou usar `length` medido para emitir valores absolutos. O `DrawableElement.length` já existe para isso.

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

Sem dependências; CSS em `<style>` escopado pelo prefixo ou em CSS module opcional. `speed` e `paused` via CSS custom properties (`--sk-speed`, `animation-play-state`), sem re-render.

**Motion:** o mesmo contrato de props usando `motion/react` (`motion.path` com `pathLength`, que é nativo no Motion). Útil para quem já tem Motion no projeto e quer controlar a animação programaticamente.

## 8. Estado do editor (Zustand)

```ts
type EditorState = {
  doc: SvgDocument | null;
  spec: AnimationSpec;
  selection: string[];
  playback: { playing: boolean; rate: number; reducedMotion: boolean };
  exportTab: "css" | "react" | "motion";
};
```

Derivados (`compiled`, `cssOutput`, `reactOutput`…) são memoizados por seletores e **não** ficam guardados no store. Undo/redo com `zundo` na Fase 5 (opcional). Sincronização com a URL feita com debounce de 300 ms.

## 9. Compartilhamento por URL

`share.encode(svg, spec)` → JSON → compressão (`lz-string` `compressToEncodedURIComponent`) → hash `#s=...`. Limite prático de cerca de 8 KB; acima disso, a UI oferece download do `.strokekit.json`. O hash não é enviado ao servidor, o que mantém a privacidade.

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

### Pendências abertas (decidir até a fase indicada)

- **Fase 2:** tirar `global.playbackRate` e `global.background` da `AnimationSpec` (são estado do preview e duplicam `playback` no store, violando a regra 1).
- **Fase 2:** simular reduced motion no Shadow DOM reescrevendo o bloco `@media (prefers-reduced-motion: reduce)` do CSS exportado como `:host([data-sk-reduced])`. É a única derivação textual permitida sobre a saída do exportador.
- **Fase 3:** `stagger-draw` com `iterations: infinite` embute o atraso nos keyframes (ciclo `duration + (n-1)*step`), porque `animation-delay` só vale na 1ª iteração.
- **Fase 4:** o export Motion aproxima o CSS (usa o `pathLength` do Motion); o WYSIWYG só vale para o CSS. Isso precisa aparecer na aba.
- **Fase 5:** com static export a OG image é gerada no build; não há OG por animação compartilhada (o hash não chega ao servidor).

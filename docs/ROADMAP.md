# ROADMAP — strokit

Regra: uma fase por vez. Ao terminar, rode `npm run lint && npm run typecheck && npm test`, marque os itens e **pare para revisão**.

---

## Fase 0 — Fundação

- [x] Monorepo com npm workspaces (`packages/core`, `apps/web`), `tsconfig.base.json` strict
- [x] Biome configurado; scripts raiz `dev`, `build`, `test`, `test:e2e`, `lint`, `typecheck`
- [x] `apps/web`: Next.js App Router, Tailwind v4, shadcn/ui inicializado, static export
- [x] Vitest em `core` e `web`; Playwright em `web` com 1 teste smoke (home carrega)
- [x] CI (GitHub Actions): lint, typecheck, test em PR

**Aceite:** `npm install && npm run build && npm test` passam do zero; CI verde.

---

## Fase 1 — Core: import e o primeiro preset

- [x] Schema Zod da `AnimationSpec` (v1) + `migrate()` stub
- [x] `sanitizeSvg()` com allowlist + fixtures maliciosas (script, `onload`, `javascript:` href, `foreignObject`, `image` externa)
- [x] `parseSvg()` / `normalizeSvg()` → `SvgDocument` (ids estáveis, detecção de fill/stroke, viewBox)
- [x] Contrato `Preset` + registry de presets
- [x] Preset `draw`
- [x] `compile()` → `CompiledAnimation`
- [x] `exporters.css()` com prefixo único, variáveis CSS e bloco reduced motion
- [x] Snapshot: `draw` × 2 fixtures
- [x] **Spike:** página HTML estática com o CSS exportado, testada em Chrome, Firefox e **Safari**. Registrar em ARCHITECTURE §12 se `pathLength` funciona em `rect`/`circle`; se não, implementar conversão de formas básicas para `<path>`
  - Resultado: automatizado em `apps/web/e2e/path-length.spec.ts`, verde em Chromium/Firefox/WebKit; conversão desnecessária. Confirmação manual no Safari real: pendente

**Aceite:** um SVG de fixture vira um SVG animado que se desenha, aberto direto no navegador, nos três navegadores; cobertura do core > 80%.

---

## Fase 2 — Editor MVP

- [x] Store Zustand (ARCHITECTURE §8) com seletores memoizados
- [x] Layout: toolbar superior, canvas central, painel de camadas à esquerda, painel de parâmetros à direita, painel de export embaixo (colapsável)
- [x] Import por drag-and-drop, file picker e colar markup; erros amigáveis (arquivo inválido, grande demais, sem elementos desenháveis)
- [x] Canvas: preview isolado (Shadow DOM) renderizando a saída do `exporters.css()`
- [x] Camadas: lista, hover destaca, seleção múltipla, "selecionar tudo"
- [x] PresetPicker (por enquanto só `draw`) e ParamsPanel gerado a partir do `paramsSchema` + `timing`
- [x] Controles: play/pause/restart, velocidade, fundo, simular reduced motion (Web Animations API)
- [x] ExportPanel: aba CSS com highlight (Shiki), copiar, baixar `.svg`
- [x] 3 logos de exemplo originais em `apps/web/public/examples/`

**Aceite:** e2e — carregar exemplo → mudar duração → ver o CSS mudar → copiar. Preview e export idênticos.

---

## Fase 3 — Presets completos e auto-stroke

- [x] `comet`, `yoyo`, `stagger-draw`, `draw-fill`, `pulse`, `march`, `fade`, `spin` (`draw` e `stagger-draw` foram removidos em 2026-09-28, ver "Decisões" na ARCHITECTURE)
- [x] Auto-stroke para elementos só com fill (RF4), com aviso na UI quando um preset exige stroke
- [x] Easing: presets + editor de cubic-bezier com curva visual
- [x] ~~`stagger.order` com seed determinística~~ (removido junto com `stagger-draw`)
- [x] Snapshots: todos os presets × 2 fixtures

**Aceite:** a logo de exemplo "só preenchimento" funciona com `draw-fill` e `yoyo` sem editar o SVG.

---

## Fase 4 — Exportadores React e Motion, compartilhamento

- [x] `exporters.react()` com o contrato de props (ARCHITECTURE §7), sem dependências
- [x] `exporters.motion()` com `motion/react`
- [x] Teste: o TSX exportado **compila** (typecheck em um arquivo temporário com tsc) — além do snapshot
- [x] Abas React e Motion no ExportPanel; download `.tsx`
- [x] `share.encode/decode` + sync com hash da URL (debounce) + botão "Copiar link"
- [x] Fallback de tamanho: export/import de `.strokit.json`

**Aceite:** e2e — criar animação → copiar link → abrir em aba nova → estado idêntico. O TSX exportado roda num app Next de exemplo.

---

## Fase 5 — Vitrine

- [x] Landing: headline com o problema, demo ao vivo no hero (a própria logo do strokit animada com `yoyo`), "como funciona" em 3 passos, comparação honesta com SVGator/GSAP/Lottie, CTA para o editor
  - Também: tema preto/branco no site todo, playground interativo, galeria só-SVG gerada pelos exportadores e seção de apoio (botão inerte até definir o método)
- [ ] OG image dinâmica
- [ ] Registry do shadcn: `stroke-draw`, `stroke-comet`, `logo-loader` + página de docs com instalação
- [ ] README: GIF de 10 s, porquê, features, instalação via registry, arquitetura resumida (diagrama do pipeline), como contribuir
  - Adiantado (2026-09-26, a pedido do autor, antes de tornar o repositório público): `LICENSE` (MIT) e um `README.md` inicial com stack, comandos e a seção "open source". Faltam GIF, comparação, diagrama e o link do registry (RF ainda não publicado)
- [ ] Acessibilidade do editor: navegação por teclado, foco visível, labels
- [ ] Deploy (Vercel ou VPS como estático)

**Aceite:** URL pública, Lighthouse > 90 na landing, README pronto para o post.

---

## Fase 5b — Export de vídeo transparente (incluída a pedido do autor)

- [x] `core/render`: amostragem determinística da IR no instante *t* (modelo de tempo do CSS) e `renderFrame()` → SVG estático por quadro
- [x] Editor: "Vídeo" no painel de código → `.webm` VP9 com alfa via WebCodecs + Mediabunny; aviso onde não houver suporte
- [x] Testes: paridade quadro × CSS do preview nos 3 motores; `.webm` com `AlphaMode` e alfa real conferido com ffmpeg

**Aceite:** um SVG importado e animado vira um `.webm` com fundo transparente cujos quadros batem com o preview.

---

## Fase 5c — Edição de camadas (incluída a pedido do autor)

- [x] `spec.layers` (overrides por camada) com allowlist de cor, sem mudar a versão da spec
- [x] `compile()` aplica cor com token por camada, espessura, opacidade, pontas, cantos e ocultar
- [x] Ponto de partida e sentido do traço em todos os presets de traço (`presets/path-motion.ts`)
- [x] `layerTree()`, `pickPathFraction()`/`pickNearestOutline()` e `reconcileSpec()` no core
- [x] Editor: seção "Camada" no painel de parâmetros, árvore de grupos com visibilidade no painel de camadas
- [x] Editor: escolher o ponto de partida clicando no contorno, com marcador no preview
- [x] Editor: diálogo "Editar SVG"
- [x] Testes: overrides no compile, snapshots novos (CSS/React/Motion), tinta amostrada com ponto de partida/sentido, TSX com camadas editadas compila, e2e nos 3 motores (inclui paridade vídeo × CSS)

**Aceite:** selecionar uma camada, mudar a cor e a espessura, clicar no contorno para escolher onde o desenho começa, e o código exportado, o vídeo e o link refletem exatamente o preview.

---

## Fase 5d — Sequência de animações e preset Brilho (incluída a pedido do autor)

- [x] `shine`: faixa de luz recortada pela silhueta, direção/inclinação/largura/intensidade/pausa; hook `Preset.compileOverlay` (chamado uma vez por track) e `PresetKind`
- [x] `Track.after` opcional (sem subir a versão da spec): mesma camada em vários tracks só se formarem uma cadeia; validação de ciclos, `infinite` no meio e preset de contorno fora do início
- [x] `compile()` funde as etapas de um elemento em uma regra, com atrasos acumulados, `fill-mode: forwards` nas etapas seguintes e estado final do reduced motion da última etapa
- [x] Exportadores: `loop` (React) e `repeat` (Motion) só atingem a última etapa
- [x] Core: `appendStep`, `removeStep`, `moveStep`, `setStepPreset`, `chainOf`, `pruneTracks`, `trackTimes`
- [x] Editor: seção "Sequência" (adicionar, reordenar, remover, escolher a etapa editada); presets e "Repetir para sempre" respeitam a cadeia
- [x] Testes: chain.test.ts, shine em presets.test.ts, snapshots CSS/React/Motion, TSX compila, e2e nos 3 motores (inclui paridade vídeo × CSS numa sequência com brilho)

**Aceite:** importar uma logo, deixar "Desenhar e preencher", adicionar "Brilho" (loop) e ver o preview, o código exportado e o vídeo tocarem na mesma ordem.

---

## Fase 7 — Criar o SVG no editor (incluída a pedido do autor)

Plano completo em fases A–D. Um modo "Desenhar" no próprio preview, sem painel novo.

**A. Largura de traço consistente**

- [x] `svg/stroke-scale.ts`: unidade visual (1 = 1% do maior lado do viewBox) compensada pela escala acumulada dos `transform` dos ancestrais
- [x] `compile()` converte a largura do editor (auto-stroke e camadas) para as unidades do elemento; o código exportado continua com número absoluto
- [x] `AnimationSpec` v2 (`global.strokeUnit`); `migrate()` converte v1 mantendo `"user"`, então projetos e links antigos abrem idênticos
- [x] `parseLength` aceita `pt`, `pc`, `mm`, `cm`, `in` (a largura já presente no arquivo aparece certa no slider)
- [x] Sliders de largura até 100 (%), com dica; textos nos 3 dicionários; entrada no changelog
- [x] Testes: `stroke-scale.test.ts` (viewBox 24 × 2000, `scale(0.1,-0.1)`, migração v1→v2), snapshots revisados

**B. Modo desenhar e formas**

- [x] Slice `draw` no store (`active`, `tool`, `width`, `color`, pilha de desfazer/refazer própria do modo); `enterDraw`/`exitDraw`, `addDrawnShapes`, `undoDraw`/`redoDraw`
- [x] Core: `draw/shapes.ts` (`shapePath`: linha, retângulo e elipse como `<path>`, Shift = proporção/45°, Alt = a partir do centro) e `draw/append.ts` (`appendDrawnPaths`, SVG em branco 512×512); a entrada passa por `importSvg`/`replaceSvg` (sanitize + normalize + reconcile)
- [x] Botão "Desenhar" na toolbar e "Criar do zero" no estado vazio; barra flutuante sobre o canvas (formas, cor, espessura em %, desfazer/refazer, concluir); atalhos L/R/E, Ctrl/Cmd+Z, Esc
- [x] Em modo desenhar o preview mostra o estado final da animação (contornos não somem); a forma nova entra com o preset padrão e fica selecionada
- [x] Testes: `draw.test.ts` (core), modo desenhar em `editor-store.test.ts`; i18n nos 3 idiomas; entrada no changelog

**C. Lápis livre**

- [x] `core/src/draw/freehand.ts`: `simplify` (Ramer-Douglas-Peucker iterativo), `smoothPath` (Catmull-Rom → Bézier cúbico) e `freehandPath`; clique sem arrastar não desenha (em vez de um ponto, que a animação de contorno não mostraria)
- [x] Ferramenta lápis (padrão do modo desenhar, atalho `P`): amostras com `getCoalescedEvents()`, tolerância fixa em pixels de tela (1,5 px), pré-visualização já suavizada
- [x] Testes: reta vira 2 pontos, canto preservado, desvio dentro da tolerância, 50 mil pontos sem estourar a pilha, `d` aceito pela importação; i18n e changelog

**D. Caneta e ajuste dos traços**

- [x] Ferramenta caneta (Bézier): `core/src/draw/pen.ts` (`penPath`: âncoras com alça que sai e espelho na chegada, `L` entre pontos sem alça, fechamento com `Z`); clique põe ponto, arrastar puxa a alça, clique no primeiro ponto fecha, Enter/duplo clique termina, Backspace/Ctrl+Z remove o último ponto, Esc descarta; trocar de ferramenta ou concluir mantém o caminho; atalho `B`
- [x] Testes: `penPath` (retas, curvas, fechamento, duplicata de duplo clique, pontos inválidos); i18n e changelog
- [ ] Editor de nós (ajustar o traço depois de criado): não entra nesta fase; fica como próximo passo se fizer falta

**E. Excluir camadas**

- [x] `core/src/svg/delete.ts` (`deleteLayers`): remove os elementos (e grupos que ficam vazios), renumera os ids que sobram e leva tracks e edições junto; `removeElements` passou para `svg/tree.ts`
- [x] Store: `deleteLayers` (seleção por padrão) e `restoreSnapshot`; no modo desenhar entra no histórico do Ctrl/Cmd+Z, fora dele há aviso com "Desfazer"
- [x] Editor: botão de lixeira na seção "Camada" e atalhos Delete/Backspace (ignorados em campos de texto, menus e diálogos)
- [x] Testes: `delete.test.ts` (core) e exclusão em `editor-store.test.ts`; i18n e changelog

**Aceite (A):** o mesmo valor de largura tem aparência equivalente num ícone 24×24 e num logo 2000×2000, e um projeto antigo abre igual.

**Aceite (B):** criar do zero, arrastar um retângulo e uma linha, desfazer, concluir e ver a animação tocar e o CSS exportado com as duas formas.

**Aceite (C):** arrastar à mão livre, soltar e ver um traço suave e leve (poucos pontos) que anima com o preset padrão.

**Aceite (D):** com a caneta, clicar três pontos, arrastar um deles para curvar, fechar no primeiro ponto e ver a forma animar; Enter termina um caminho aberto.

**Aceite (E):** selecionar camadas, apertar Delete/Backspace ou clicar na lixeira, ver as outras continuarem animando com seus ajustes e desfazer pelo aviso.

---

## Fase 6 — Polimento (opcional antes do lançamento)

- [ ] Undo/redo (`zundo`) com atalhos
- [ ] Atalhos de teclado (espaço = play/pause, R = restart)
- [ ] Mobile: editor em modo "somente visualizar + exportar"

---

## Depois (pós-MVP, não implementar sem pedido)

Morphing de paths · export GIF / MP4 · export Lottie · timeline de keyframes livres · animação disparada por scroll/hover · plugin do Figma · MCP server para agentes gerarem loaders · galeria da comunidade.

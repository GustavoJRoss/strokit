# SPEC — strokit

## 1. Problema

Animar uma logo para uma tela de carregamento (traços que se desenham, riscos que vão e voltam no contorno) exige hoje escolher entre duas opções ruins:

- **Editores visuais** (SVGator, Rive, Lottie): feitos para designers, muitas vezes pagos para exportar código limpo, frequentemente adicionam uma runtime JS e não entendem tema, dark mode ou componentes React.
- **Código na mão** (CSS, GSAP, Motion): controle total, mas descobrir o valor certo de `stroke-dasharray`, `stroke-dashoffset`, delays e easing é tentativa e erro demorada.

## 2. Proposta

Um editor no navegador onde o dev:

1. arrasta o SVG da logo;
2. vê os paths detectados e separados em camadas;
3. aplica um preset por camada (ou no grupo inteiro);
4. ajusta parâmetros com sliders e vê o resultado ao vivo;
5. copia ou baixa o código em **CSS puro**, **componente React (TSX)** ou **componente Motion**;
6. compartilha a animação por URL.

Tudo no cliente. Sem conta, sem backend no MVP.

## 3. Público

Devs front-end React/Next que precisam de um loader ou reveal de marca e não querem abrir uma ferramenta de motion design.

## 4. Presets do MVP

| Preset | Efeito | Técnica |
|---|---|---|
| `draw` | A logo se desenha do início ao fim | `dasharray: 1 1`, `dashoffset: 1 → 0` com `pathLength="1"` |
| `comet` | Um traço curto percorre o contorno em loop | `dasharray: L (1-L)`, `dashoffset: 1 → 0`, `infinite` |
| `yoyo` | Riscos que vão e voltam (o caso da tela de loading) | `comet` com `animation-direction: alternate` |
| `stagger-draw` | Cada path desenha com atraso incremental | `draw` + `animation-delay: i * stagger` |
| `draw-fill` | Desenha o contorno e depois preenche | keyframes combinando `dashoffset` e `fill-opacity` |
| `pulse` | Estado de espera: opacidade/escala suave | `opacity` e `transform: scale` com `transform-box: fill-box` |
| `march` | "Formigas marchando" contínuo | `dasharray` curto repetido + `dashoffset` linear infinito |

Parâmetros comuns: `duration` (ms), `delay` (ms), `easing` (presets + cubic-bezier customizado), `iterations` (número ou infinito), `direction`, `strokeWidth`, `color` (token ou valor).
Parâmetros específicos: `comet.length` (0–1), `stagger.step` (ms), `stagger.order` (documento, reverso, aleatório com seed), `draw-fill.fillAt` (0–1 do tempo total), `march.dash` e `march.gap`.

## 5. Requisitos funcionais

- **RF1 Import:** aceitar `.svg` por drag-and-drop, file picker ou colar markup. Limite de 500 KB.
- **RF2 Sanitização:** remover conteúdo executável e externo antes de qualquer renderização (ver ARCHITECTURE §5).
- **RF3 Normalização:** detectar elementos desenháveis (`path`, `line`, `polyline`, `polygon`, `rect`, `circle`, `ellipse`), atribuir IDs estáveis e preservar `viewBox` e transforms.
- **RF4 Logos só com preenchimento:** a maioria das logos não tem `stroke`. Se um elemento só tem `fill`, o editor deve permitir gerar um stroke automático (cor do fill e largura configurável) para os presets de traço funcionarem. O preset `draw-fill` é o caminho recomendado nesse caso.
- **RF5 Camadas:** lista de elementos com hover que destaca o elemento no canvas, seleção múltipla e aplicação de preset por seleção.
- **RF6 Parâmetros:** painel com sliders e inputs numéricos sincronizados; mudanças refletem no preview em menos de 50 ms.
- **RF7 Controles de preview:** play, pause, restart, velocidade (0.25x–2x), fundo claro/escuro/xadrez e toggle "simular reduced motion".
- **RF8 Export:** abas CSS, React e Motion com syntax highlight, botão copiar e download (`.svg` animado, `.tsx`).
- **RF9 Compartilhar:** a `AnimationSpec` e o SVG comprimidos na URL (hash). Abrir a URL reconstrói o estado. Se o tamanho passar do limite seguro, avisar e oferecer download de um `.strokit.json`.
- **RF10 Import de projeto:** carregar um `.strokit.json`.
- **RF11 Exemplos:** 3–4 logos de exemplo originais (não usar marcas reais) para o usuário testar sem ter um SVG.

## 6. Requisitos não funcionais

- **Zero runtime** no export CSS; o componente React não depende de nenhuma lib além de React.
- **Acessibilidade do código exportado:** `role="img"` + `aria-label` configurável; variante loader com `role="status"` e texto visualmente oculto; reduced motion sempre tratado.
- **Acessibilidade do editor:** navegação por teclado completa e foco visível (Radix ajuda).
- **Performance:** preview fluido com até 200 elementos; animar apenas propriedades de stroke, opacity e transform.
- **Compatibilidade:** Chrome, Firefox e Safari atuais. `pathLength` no Safari precisa de validação na Fase 1 (ver ARCHITECTURE §6).
- **Privacidade:** nenhum SVG sai do navegador.

## 7. Fora de escopo no MVP

Morphing entre formas, export Lottie/GIF/vídeo, timeline com keyframes livres, contas e salvamento em nuvem, colaboração, animações disparadas por scroll, IA gerando animação, i18n.

Esses itens ficam registrados como candidatos pós-MVP em ROADMAP §Depois.

## 8. Métricas de sucesso (portfólio)

- Demo ao vivo com URL pública e logo de exemplo carregando em menos de 2 s.
- GIF de 10 s mostrando arrastar a logo → escolher preset → copiar código.
- README com o "porquê", o GIF, a comparação com as alternativas e instalação via registry.
- Cobertura de testes no `core` acima de 80%.

/**
 * Portuguese: the source of truth. `Dictionary` is derived from this object, so en/es must
 * provide exactly the same keys (TypeScript fails otherwise). Plurals and interpolations are
 * functions.
 */
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const pt = {
  meta: {
    titles: {
      home: "strokit — anime sua logo SVG e exporte código",
      editor: "Editor · strokit",
      examples: "Componentes exportados · strokit",
      changelog: "Changelog · strokit",
    },
  },
  common: {
    copy: "Copiar",
    copied: "Copiado",
    cancel: "Cancelar",
    loading: "Carregando…",
    home: "strokit, início",
  },
  language: { label: "Idioma" },
  theme: { label: "Tema", system: "Tema do sistema", light: "Tema claro", dark: "Tema escuro" },

  toolbar: {
    importSvg: "Importar SVG",
    pasteMarkup: "Colar markup",
    examples: "Exemplos",
    play: "Reproduzir",
    pause: "Pausar",
    restart: "Reiniciar",
    speed: "Velocidade do preview",
    background: "Fundo do preview",
    backgrounds: { light: "Claro", dark: "Escuro", checker: "Xadrez" },
    reducedMotion: "Simular reduced motion",
  },
  paste: {
    title: "Colar SVG",
    description:
      "Cole o código do SVG. Ele é sanitizado antes de qualquer renderização e não sai do seu navegador.",
    label: "Markup do SVG",
    submit: "Importar",
  },
  svgEditor: {
    button: "Editar SVG",
    title: "Editar o SVG",
    description:
      "Altere o markup à vontade. Ele passa de novo pela sanitização, e as animações e edições continuam nas camadas que ficarem na mesma posição.",
    label: "Markup do SVG",
    apply: "Aplicar",
    applied: "SVG atualizado",
    summary: (kept: number, added: number, removed: number) =>
      [
        `${kept} ${plural(kept, "camada mantida", "camadas mantidas")}`,
        added > 0 ? `${added} ${plural(added, "nova", "novas")} (com Desenhar)` : "",
        removed > 0 ? `${removed} ${plural(removed, "removida", "removidas")}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
  },
  empty: {
    title: "Arraste a sua logo SVG para cá",
    body: "Ou escolha um arquivo, cole o markup (Ctrl/⌘+V também funciona) ou comece com um exemplo. Nada sai do seu navegador.",
  },
  editor: {
    loading: "Carregando o editor…",
    dropHere: "Solte o SVG ou o projeto para importar",
  },
  share: {
    menu: "Compartilhar",
    copyLink: "Copiar link",
    downloadProject: (extension: string) => `Baixar projeto (${extension})`,
    openProject: "Abrir projeto…",
    tooLarge: "Esta animação é grande demais para um link",
    tooLargeBody: (extension: string) => `Baixe o projeto (${extension}) e compartilhe o arquivo.`,
    downloadAction: "Baixar projeto",
    linkCopied: "Link copiado",
    linkCopiedBody: "A animação e o SVG vão no próprio link.",
    copyFallback: "Não foi possível copiar automaticamente. Copie o link:",
  },
  draft: {
    restored: "Trabalho anterior restaurado",
    restoredBody: "Seu último SVG e a animação estavam salvos neste navegador.",
    startOver: "Começar do zero",
  },
  layers: {
    title: "Camadas",
    all: "Todas",
    none: "Nenhuma",
    empty: "Importe um SVG para ver as camadas.",
    hint: "Shift seleciona um intervalo; Ctrl/⌘ soma à seleção.",
    hide: "Esconder camadas",
    noStroke: "Sem traço: ative o traço automático",
    group: "Grupo",
    groupCount: (n: number) => `${n} ${plural(n, "camada", "camadas")}`,
    expand: "Expandir grupo",
    collapse: "Recolher grupo",
    showLayer: "Mostrar camada",
    hideLayer: "Ocultar camada",
    edited: "Camada editada",
    tags: {
      path: "Caminho",
      line: "Linha",
      polyline: "Polilinha",
      polygon: "Polígono",
      rect: "Retângulo",
      circle: "Círculo",
      ellipse: "Elipse",
    },
  },
  params: {
    title: "Parâmetros",
    hide: "Esconder parâmetros",
    layer: {
      title: "Camada",
      none: "Nenhuma camada selecionada",
      selected: (n: number) => `${n} ${plural(n, "camada selecionada", "camadas selecionadas")}`,
      selectHint:
        "Selecione uma camada na lista ou no preview para mudar cor, espessura e ponto de partida.",
      editingMany: (n: number) => `Editando ${n} camadas: as mudanças valem para todas.`,
      name: "Nome",
      namePlaceholder: "Ex.: olho",
      nameHint: "Também nomeia as variáveis CSS da camada (--sk-nome-stroke).",
      visible: "Visível",
      stroke: "Cor do traço",
      fill: "Cor do preenchimento",
      colorText: (label: string) => `${label} (texto)`,
      original: "Original",
      auto: "Automático",
      noColor: "Nenhum",
      invalidColor: "Cor inválida. Use #hex, rgb(), hsl() ou um nome de cor.",
      strokeWidth: "Espessura do traço",
      opacity: "Opacidade",
      linecap: "Pontas do traço",
      linecaps: { butt: "Retas", round: "Arredondadas", square: "Quadradas" },
      linejoin: "Cantos",
      linejoins: { miter: "Vivos", round: "Arredondados", bevel: "Chanfrados" },
      fromSvg: "Do SVG",
      start: "Ponto de partida",
      pickStart: "Escolher no preview",
      picking: "Clique no contorno da camada (Esc cancela)",
      startHint: "Em caminhos abertos, o desenho segue até o fim e continua do começo.",
      startMarker: "Ponto de partida da animação",
      reverse: "Inverter sentido",
      reset: "Restaurar camada",
    },
    preset: {
      title: "Preset",
      none: "Nenhum preset ativo",
      appliesToSelection: (n: number) =>
        `Aplica ${plural(n, "à", "às")} ${n} ${plural(n, "camada selecionada", "camadas selecionadas")}.`,
      appliesToAll: "Sem seleção: aplica a todas as camadas.",
    },
    sequence: {
      title: "Sequência",
      summary: (n: number) => (n <= 1 ? "Uma animação" : `${n} animações em sequência`),
      hint: "As animações tocam uma depois da outra. Só a última pode repetir para sempre.",
      step: (n: number, preset: string) => `${n}. ${preset}`,
      add: "Adicionar animação",
      addLabel: "Depois da última, tocar:",
      outlineFirst: "Desenhos de contorno só podem ser a primeira etapa.",
      remove: "Remover etapa",
      moveUp: "Mover para cima",
      moveDown: "Mover para baixo",
      empty: "Escolha um preset para começar.",
    },
    timing: {
      title: "Animação",
      noTrackSummary: "Nenhuma camada animada selecionada",
      layerWithoutPreset: "A camada selecionada não tem preset. Escolha um acima.",
      selectLayer: "Selecione uma camada para editar a animação dela.",
      trackInfo: (preset: string, n: number) =>
        `${preset} · ${n} ${plural(n, "camada", "camadas")}`,
      summary: (ms: number, easing: string, repeats: string) => `${ms} ms · ${easing} · ${repeats}`,
      forever: "sempre",
      times: (n: number) => `${n}x`,
      duration: "Duração",
      delay: "Atraso",
      repetitions: "Repetições",
      repeatForever: "Repetir para sempre",
      delayAfterPrevious: "Espera depois da etapa anterior.",
      loopLast: "Só a última etapa da sequência pode repetir para sempre.",
      direction: "Direção",
      directions: {
        normal: "Normal",
        reverse: "Reversa",
        alternate: "Vai e volta",
        "alternate-reverse": "Volta e vai",
      },
    },
    easing: {
      label: "Easing",
      custom: "Personalizado",
      presets: {
        linear: "Linear",
        ease: "Suave",
        "ease-in": "Acelerar",
        "ease-out": "Desacelerar",
        "ease-in-out": "Acelerar e desacelerar",
      },
      curve: "Curva de easing",
      curveHelp: "Curva de easing: arraste os pontos ou use as setas",
      point: (n: number) => `Ponto de controle ${n}`,
    },
    global: {
      title: "Geral",
      autoStrokeSummary: (on: boolean) => `Traço automático ${on ? "ligado" : "desligado"}`,
      a11yLabel: "Rótulo acessível",
      autoStroke: "Traço automático",
      strokeWidth: "Largura do traço",
      autoStrokeHint:
        "Camadas só com preenchimento ganham um traço na cor do preenchimento para os presets de traço funcionarem.",
      strokeWidthHint:
        "Em % do tamanho do SVG: a mesma largura tem a mesma aparência em qualquer logo.",
      missing: (n: number) => `${n} ${plural(n, "camada sem traço", "camadas sem traço")}`,
      missingBody: "O preset anima o traço, mas essas camadas só têm preenchimento.",
      enableAutoStroke: "Ativar traço automático",
    },
  },
  presets: {
    "draw-fill": {
      label: "Desenhar e preencher",
      description:
        "Desenha o contorno e depois preenche. Recomendado para logos só com preenchimento.",
    },
    comet: { label: "Cometa", description: "Um traço curto percorre o contorno em loop." },
    yoyo: {
      label: "Vai e vem",
      description: "Um risco que vai e volta pelo contorno. Ideal para telas de carregamento.",
    },
    march: {
      label: "Formigas marchando",
      description: "Tracejado curto que anda sem parar pelo contorno.",
    },
    pulse: { label: "Pulsar", description: "Estado de espera: opacidade e escala suaves." },
    fade: {
      label: "Aparecer",
      description: "A peça inteira aparece com fade, deslizando na direção escolhida.",
    },
    spin: {
      label: "Girar",
      description: "A logo gira em torno do centro. Ótimo para telas de carregamento.",
    },
    shine: {
      label: "Brilho",
      description: "Um reflexo de luz atravessa a peça na direção escolhida, como numa moeda.",
    },
  },
  presetParams: {
    angle: "Ângulo",
    pivot: "Pivô",
    direction: "Direção",
    distance: "Distância",
    length: "Comprimento do traço",
    fillAt: "Início do preenchimento",
    scale: "Escala máxima",
    minOpacity: "Opacidade mínima",
    dash: "Traço",
    gap: "Espaço",
    width: "Largura do brilho",
    intensity: "Intensidade",
    rest: "Pausa entre brilhos",
  },
  presetOptions: {
    direction: {
      cw: "Horário",
      ccw: "Anti-horário",
      up: "Para cima",
      down: "Para baixo",
      left: "Para a esquerda",
      right: "Para a direita",
      none: "Sem deslocamento",
    },
    pivot: { logo: "Logo inteira", piece: "Cada peça" },
  },
  exportPanel: {
    title: "Exportar",
    hints: {
      css: "SVG com <style> embutido. Zero runtime.",
      react: "Componente React tipado, sem dependências. speed, loop e paused não re-renderizam.",
      motion:
        "Requer motion. Reproduz a mesma animação via useAnimate; o preview ao lado mostra a versão CSS.",
    },
    codeCopied: "Código copiado",
    copyFailed: "Não foi possível copiar. Selecione o código e copie manualmente.",
    downloadSvg: "Baixar .svg",
    downloadTsx: "Baixar .tsx",
    show: "Mostrar código",
    collapse: "Recolher código",
    empty: "O código aparece aqui assim que você importar um SVG.",
  },
  layout: {
    menu: "Layout",
    panels: "Painéis",
    names: { layers: "Camadas", params: "Parâmetros", export: "Código" },
    show: { layers: "Mostrar camadas", params: "Mostrar parâmetros" },
    reset: "Restaurar layout",
    resize: {
      layers: "Redimensionar camadas",
      params: "Redimensionar parâmetros",
      export: "Redimensionar código",
    },
  },
  video: {
    button: "Vídeo",
    title: "Exportar vídeo transparente",
    description:
      "Um .webm (VP9) com fundo transparente, gerado quadro a quadro no seu navegador. O SVG não sai do seu computador.",
    checking: "Verificando o suporte do navegador…",
    unsupported:
      "Este navegador não consegue gravar vídeo com transparência (VP9 com canal alfa). Use uma versão recente do Chrome, do Edge ou do Firefox.",
    width: "Largura",
    output: (width: number, height: number) =>
      `Saída: ${width} × ${height} px (mantém a proporção do SVG).`,
    duration: "Duração",
    fps: "Quadros por segundo",
    strokeColor: "Cor do traço",
    strokes: { original: "Cores originais", white: "Branco", black: "Preto" },
    progressLabel: "Progresso da exportação",
    progress: (percent: number) => `Gerando quadros… ${percent}%`,
    export: "Exportar .webm",
    done: "Vídeo exportado",
    doneBody: (width: number, height: number, fps: number) =>
      `${width}×${height}, ${fps} fps, fundo transparente.`,
    failed: "Não foi possível gerar o vídeo.",
  },
  importing: {
    adjusted: "SVG importado com ajustes",
    generic: "Não foi possível importar o SVG.",
    exampleFailed: (name: string) => `Não foi possível carregar o exemplo ${name}.`,
    svgErrors: {
      empty: "O arquivo está vazio.",
      "too-large": "O SVG passa do limite de 500 KB.",
      doctype: "SVGs com DOCTYPE ou entidades não são aceitos.",
      "invalid-xml": "O SVG tem XML inválido.",
      "not-svg": "O arquivo não é um SVG.",
      "no-drawables": "Nenhum elemento desenhável foi encontrado no SVG.",
    },
    shareErrors: {
      "invalid-content": "Conteúdo inválido.",
      "missing-svg": "O SVG está faltando.",
      "invalid-spec": "A animação salva é inválida ou de uma versão não suportada.",
      "corrupt-link": "O link está incompleto ou corrompido.",
      "invalid-json": "O arquivo não é um JSON válido.",
      "not-project": "O arquivo não é um projeto do strokit.",
    },
    fileErrors: {
      "not-svg-file": "Escolha um arquivo .svg.",
      "too-large": "O SVG passa do limite de 500 KB.",
    },
    warnings: {
      removedElement: (element: string) =>
        `Elemento <${element}> removido por segurança ou por não ser suportado.`,
      unsupportedSelector: (selector: string) => `Seletor CSS não suportado ignorado: ${selector}`,
      missingViewBox: "O SVG não tinha viewBox; usamos o tamanho do arquivo.",
    },
  },
  examples: {
    orbita: { name: "Órbita", description: "Só traços, várias cores" },
    pico: { name: "Pico", description: "Só preenchimento" },
    onda: { name: "Onda", description: "Cores por classe CSS" },
    assinatura: { name: "Assinatura", description: "Um traço contínuo" },
    anel: { name: "Anel", description: "Formas fechadas, bom para loaders" },
    selo: { name: "Selo", description: "Círculos e polígono" },
  },

  home: {
    nav: {
      how: "Como funciona",
      examples: "Exemplos",
      code: "Código",
      support: "Apoiar",
      openSource: "Open source",
      changelog: "Changelog",
    },
    navLabel: "Seções",
    openEditor: "Abrir editor",
    hero: {
      eyebrow: "Animação de logo · código primeiro",
      title: "Sua logo em movimento. Em código.",
      body: "Arraste o SVG, escolha um efeito de traço e leve CSS puro, um componente React tipado ou Motion. Sem runtime, respeitando o tema e o",
      openEditor: "Abrir o editor",
      seeExamples: "Ver exemplos",
      replay: "Reiniciar a animação da marca",
      replayHint: "Clique para reiniciar",
    },
    problem: {
      eyebrow: "O problema",
      title: "Animar uma logo não devia ser tão chato",
      lead: "Hoje você escolhe entre duas opções ruins.",
      visualTitle: "Editores visuais",
      visual: [
        "Feitos para designers, não para quem vive no código.",
        "Exportar código limpo costuma ser pago.",
        "Muitas vezes adicionam um player JS ao seu bundle.",
        "Não conhecem seu tema, dark mode ou componentes.",
      ],
      handTitle: "Código na mão",
      hand: "Controle total, mas acertar comprimentos, atrasos e easing vira tentativa e erro.",
      conclusion:
        "O strokit fica no meio: você ajusta vendo o resultado e leva código que qualquer dev entende.",
    },
    how: {
      eyebrow: "Como funciona",
      title: "Três passos. Nenhuma timeline.",
      steps: [
        {
          title: "Arraste o SVG",
          text: "Solte a logo, escolha um arquivo ou cole o markup. Tudo é sanitizado e nada sai do seu navegador.",
          alt: "Pico se desenhando e se preenchendo",
        },
        {
          title: "Escolha e ajuste",
          text: "Cinco presets de traço, com duração, atraso, easing e curva personalizada. O preview é exatamente o código exportado.",
          alt: "Ondas com riscos indo e voltando",
        },
        {
          title: "Copie o código",
          text: "CSS puro, componente React tipado ou Motion. Ou um vídeo .webm transparente.",
          alt: "Anel com um cometa girando",
        },
      ],
    },
    playground: {
      eyebrow: "Playground",
      title: "Mexa. O código muda junto.",
      lead: "Este preview roda o próprio strokit no seu navegador e mostra exatamente o CSS que ele gera.",
      loading: "Carregando o playground…",
      logo: "Logo",
      preset: "Preset",
      duration: "Duração",
      repeat: "Repetir para sempre",
      themeColor: "Cor do tema",
      exported: "CSS exportado",
      openInEditor: "Abrir no editor",
    },
    gallery: {
      eyebrow: "Exemplos",
      title: "Só SVG. Só CSS.",
      lead: "Cada card é um componente exportado pelo strokit: nenhuma biblioteca de animação, nenhum JS rodando o movimento. Baixe o .svg ou abra no editor.",
      themeColor: "Cor do tema",
      speed: "Velocidade",
      download: (preset: string, name: string) => `Baixar ${preset} (${name}) em .svg`,
      open: (preset: string, name: string) => `Abrir ${preset} (${name}) no editor`,
      downloadHint: "Baixar .svg",
      openHint: "Abrir no editor",
    },
    code: {
      eyebrow: "O código",
      title: "Código que você colaria no seu projeto",
      lead: "A mesma animação nos três formatos. Tudo gerado, nada editado à mão.",
      features: [
        {
          title: "Zero runtime",
          text: "O CSS é o próprio SVG com <style>. O React não depende de nada além de React.",
        },
        {
          title: "Tema de verdade",
          text: "Cores saem como var(--sk-stroke, …). Troque por currentColor e a logo segue seu tema.",
        },
        {
          title: "Reduced motion",
          text: "Todo export tem @media (prefers-reduced-motion) mostrando o quadro final.",
        },
        {
          title: "Props sem re-render",
          text: "speed, loop e paused viram variáveis CSS no componente React.",
        },
      ],
    },
    comparison: {
      eyebrow: "Comparação honesta",
      title: "Faz uma coisa. E faz em código.",
      lead: "O strokit não substitui ferramentas de motion design. Ele resolve o caso mais comum: dar vida ao traço de uma logo ou loader.",
      caption: "Comparação entre strokit, SVGator, GSAP e Lottie",
      criterion: "Critério",
      rows: [
        {
          label: "Como você cria",
          values: ["Presets + ajustes", "Editor visual", "Código na mão", "After Effects"],
        },
        {
          label: "O que vai para o projeto",
          values: ["CSS / TSX legível", "SVG exportado", "Seu código + lib", "JSON + player"],
        },
        {
          label: "JS extra no bundle",
          values: ["Nenhum (CSS/React)", "Opcional", "Biblioteca", "Player"],
        },
        { label: "Cores do tema", values: ["var(--sk-stroke)", "Limitado", "Manual", "Difícil"] },
        { label: "Reduced motion", values: ["Automático", "Manual", "Manual", "Manual"] },
        { label: "Animações complexas", values: ["Não é o foco", "Sim", "Sim", "Sim"] },
      ],
    },
    openSource: {
      eyebrow: "Open source",
      title: "Código aberto. Vem olhar por dentro.",
      body: "O strokit é público no GitHub sob a licença MIT: use, copie, modifique e redistribua, inclusive comercialmente. O @strokit/core também serve de base para gerar animações de SVG fora do editor.",
      repoButton: "Ver no GitHub",
      issuesButton: "Reportar um problema",
      cards: [
        { title: "Dê uma estrela", body: "Ajuda outras pessoas a encontrarem o projeto." },
        { title: "Abra uma issue", body: "Bugs, ideias de preset e sugestões são bem-vindos." },
        { title: "Contribua", body: "Fluxo de trabalho e regras do projeto estão no README." },
      ],
      license: "Licença MIT",
      repoLabel: "Repositório no GitHub",
    },
    support: {
      eyebrow: "Apoie",
      title: "Gostou? Ajude o strokit a crescer.",
      body: "O strokit é um projeto independente, gratuito e sem anúncios. Uma contribuição ajuda a manter o site no ar e a tirar do papel novos presets, o registry do shadcn e mais formatos de export.",
      button: "Apoiar o projeto",
      soon: "Formas de apoio em breve.",
      heart: "Coração se desenhando",
    },
    footer: {
      label: "Rodapé",
      github: "GitHub",
      editor: "Editor",
      exported: "Componentes exportados",
      changelog: "Changelog",
      top: "Topo",
      madeBy: (author: string) => `Feito por ${author}.`,
    },
  },
  examplesPage: {
    title: "Componentes exportados",
    body: "Estes componentes saíram direto dos exportadores do strokit e são compilados pelo próprio Next.js deste site. Nenhuma linha foi editada à mão.",
    create: "Criar o seu no editor",
    cards: {
      orbitaReact: "React · Pulsar, em loop",
      ondaReact: "React · Cometa, speed={2}",
      picoMotion: 'Motion · Vai e vem, role="status"',
      orbitaMotion: "Motion · Desenhar e preencher, loop",
    },
  },
  changelogPage: {
    eyebrow: "Changelog",
    title: "O que já mudou",
    lead: "Registro do que foi implementado no strokit, do primeiro commit até agora: presets que saíram, funcionalidades novas, decisões de rumo.",
    fullHistory: "Ver o histórico completo de commits no GitHub",
  },
  changelog: {
    "consistent-stroke-width": {
      title: "Largura do traço consistente",
      body: "A largura do traço agora é medida em % do tamanho do SVG, então o mesmo valor tem a mesma aparência num ícone pequeno e num logo grande (inclusive quando o SVG tem escala aplicada em grupos). O limite subiu para 100 e a largura que já vem no arquivo é mostrada corretamente, mesmo em unidades como mm. Projetos e links antigos abrem exatamente como antes.",
    },
    seo: {
      title: "Compartilhamento e busca melhorados",
      body: "O site agora aparece com preview correto ao compartilhar (LinkedIn, WhatsApp) e está pronto para indexação no Google: sitemap, robots.txt e dados estruturados.",
    },
    "animation-sequence": {
      title: "Sequência de animações",
      body: 'Agora você pode encadear animações na mesma logo: por exemplo, desenhar e preencher e depois um brilho em loop. Na seção "Sequência" do editor você adiciona, reordena e remove etapas, e cada uma tem seus próprios ajustes. Só a última etapa repete para sempre. O código exportado (CSS, React e Motion), o vídeo e o link seguem a mesma ordem.',
    },
    "shine-preset": {
      title: "Novo preset: Brilho",
      body: "Um reflexo de luz atravessa a logo como o brilho de uma moeda. Você escolhe a direção (direita, esquerda, cima ou baixo), a inclinação, a largura, a intensidade e a pausa entre um brilho e outro. O reflexo só aparece sobre as partes preenchidas e respeita a preferência de movimento reduzido.",
    },
    "fade-preset": {
      title: "Novos presets: Aparecer e Girar",
      body: "Aparecer faz a logo inteira surgir com fade, sem contorno, deslizando para cima, para baixo ou para os lados. Girar faz a logo rodar em torno do centro, ótima para telas de carregamento. Em ambos você escolhe direção e ajustes; no Girar, também se gira a logo inteira ou cada peça.",
    },
    "leaner-presets": {
      title: "Presets mais enxutos",
      body: 'Os presets "Desenhar" e "Desenhar em sequência" saíram — o resultado visual era fraco. "Desenhar e preencher" passa a ser o preset padrão ao importar um SVG.',
    },
    "open-source-section": {
      title: "Seção Open Source na home",
      body: "Link para o repositório, para abrir uma issue e para a licença MIT, direto na home. O menu e o rodapé também ganharam o link do GitHub.",
    },
    "layer-editing": {
      title: "Edição de camadas",
      body: "Cor, espessura e ponto de partida do traço, ajustáveis por camada — com seleção direto no canvas e edição do markup do SVG.",
    },
    "three-languages": {
      title: "Interface em três idiomas",
      body: "strokit passa a estar disponível em português, inglês e espanhol.",
    },
    "open-source-license": {
      title: "Projeto open source",
      body: "strokit é liberado sob a licença MIT, com README explicando a stack, os comandos e como contribuir.",
    },
    "react-motion-export": {
      title: "Export React, Motion e compartilhamento",
      body: "Componente React tipado, componente Motion, link de compartilhamento e download do arquivo de projeto (.strokit.json).",
    },
    "video-export": {
      title: "Exportação de vídeo",
      body: "Vídeo .webm transparente, gerado direto no editor a partir da animação compilada.",
    },
    "complete-presets": {
      title: "Presets completos",
      body: "Cometa, vai e vem, formigas marchando, desenhar e preencher e pulsar — com traço automático para logos que só têm preenchimento.",
    },
    "editor-mvp": {
      title: "MVP do editor",
      body: "Importar um SVG, aplicar um preset, ver o preview ao vivo e exportar CSS puro com zero runtime.",
    },
  },
};

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? Widen<U>[]
      : T extends object
        ? { [K in keyof T]: Widen<T[K]> }
        : T;

/** Shape every language must implement (Portuguese literals widened to string). */
export type Dictionary = Widen<typeof pt>;

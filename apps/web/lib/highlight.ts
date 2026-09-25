import type { HighlighterCore, ThemedToken } from "shiki/core";

export type CodeLanguage = "html" | "tsx";

type Segment = { text: string; lang: "html" | "css" | "tsx" };

const THEME = "github-light";

let highlighter: Promise<HighlighterCore> | null = null;

/** Shiki is loaded lazily, with the JS regex engine (no WASM) and only the languages we export. */
function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ]);
    return createHighlighterCore({
      themes: [import("shiki/themes/github-light.mjs")],
      langs: [
        import("shiki/langs/css.mjs"),
        import("shiki/langs/html.mjs"),
        import("shiki/langs/tsx.mjs"),
      ],
      engine: createJavaScriptRegexEngine(),
    });
  })();
  return highlighter;
}

/**
 * The HTML grammar does not treat `<style>` inside `<svg>` as CSS, so the embedded
 * stylesheet is highlighted as its own segment.
 */
export function splitSegments(code: string, lang: CodeLanguage): Segment[] {
  if (lang !== "html") return [{ text: code, lang }];
  const match = /^([\s\S]*?<style>)([\s\S]*?)(<\/style>[\s\S]*)$/.exec(code);
  if (!match) return [{ text: code, lang: "html" }];
  return [
    { text: match[1] ?? "", lang: "html" },
    { text: match[2] ?? "", lang: "css" },
    { text: match[3] ?? "", lang: "html" },
  ];
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderLines(lines: ThemedToken[][], background: string): string {
  const body = lines
    .map(
      (line) =>
        `<span class="line">${line
          .map(
            (token) =>
              `<span style="color:${token.color ?? "inherit"}">${escapeHtml(token.content)}</span>`,
          )
          .join("")}</span>`,
    )
    .join("\n");
  return `<pre class="shiki" style="background-color:${background}"><code>${body}</code></pre>`;
}

export async function highlight(code: string, lang: CodeLanguage): Promise<string> {
  const instance = await getHighlighter();
  const lines: ThemedToken[][] = [[]];
  let background = "transparent";
  for (const segment of splitSegments(code, lang)) {
    const result = instance.codeToTokens(segment.text, { lang: segment.lang, theme: THEME });
    background = result.bg ?? background;
    result.tokens.forEach((line, index) => {
      if (index > 0) lines.push([]);
      lines[lines.length - 1]?.push(...line);
    });
  }
  return renderLines(lines, background);
}

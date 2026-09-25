import { describe, expect, it } from "vitest";
import { highlight, splitSegments } from "@/lib/highlight";

describe("splitSegments", () => {
  it("splits the embedded stylesheet out of the exported SVG", () => {
    expect(splitSegments("<svg><style>\n.a{}\n</style><path/></svg>", "html")).toEqual([
      { text: "<svg><style>", lang: "html" },
      { text: "\n.a{}\n", lang: "css" },
      { text: "</style><path/></svg>", lang: "html" },
    ]);
  });

  it("keeps code without a style block whole", () => {
    expect(splitSegments("<svg/>", "html")).toEqual([{ text: "<svg/>", lang: "html" }]);
    expect(splitSegments("const a = 1", "tsx")).toEqual([{ text: "const a = 1", lang: "tsx" }]);
  });
});

describe("highlight", () => {
  it("preserves the code text and colors CSS properties", async () => {
    const code = '<svg><style>\n.a {\n  fill: red;\n}\n</style><path d="M0 0"/></svg>';
    const html = await highlight(code, "html");
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.textContent).toBe(code);
    const fill = [...container.querySelectorAll("span[style]")].find(
      (span) => span.textContent === "fill",
    );
    expect(fill?.getAttribute("style")).not.toBe("color:#24292E");
  });
});

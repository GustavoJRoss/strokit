import { describe, expect, it } from "vitest";
import { importSvg } from "../src/svg/import";
import { moveElements } from "../src/svg/move";
import { parseTransform } from "../src/svg/transform";
import { parser } from "./helpers";

const load = (markup: string) => importSvg(markup, { parser }).document;
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

/** Transform attribute of every drawable after the move, in document order. */
function transforms(markup: string): (string | undefined)[] {
  const next = load(markup);
  const found: (string | undefined)[] = [];
  const visit = (node: (typeof next)["root"]) => {
    if (node.attrs["data-sk-id"]) found.push(node.attrs.transform);
    for (const child of node.children) if (child.type === "element") visit(child);
  };
  visit(next.root);
  return found;
}

describe("moveElements", () => {
  it("adds a translate to an element without a transform", () => {
    const document = load(svg('<path d="M0 0h10" stroke="red"/><path d="M0 5h10" stroke="red"/>'));
    const result = moveElements(document, ["sk-1"], 5, -3);
    expect(transforms(result)).toEqual([undefined, "translate(5 -3)"]);
  });

  it("adds up with an existing translate", () => {
    const document = load(svg('<path d="M0 0h10" stroke="red" transform="translate(2 4)"/>'));
    const once = moveElements(document, ["sk-0"], 1, 1);
    expect(transforms(once)).toEqual(["translate(3 5)"]);
    expect(transforms(moveElements(load(once), ["sk-0"], -3, -5))).toEqual(["translate(0 0)"]);
  });

  it("puts the move in front of any other transform", () => {
    const document = load(svg('<path d="M0 0h10" stroke="red" transform="rotate(90)"/>'));
    const [transform] = transforms(moveElements(document, ["sk-0"], 10, 0));
    expect(transform).toBe("translate(10 0) rotate(90)");
    // The result lands 10 units right of where it was, still rotated.
    expect(parseTransform(transform)).toEqual([expect.closeTo(0), 1, -1, expect.closeTo(0), 10, 0]);
  });

  it("converts the move into the space of a scaled and rotated parent", () => {
    const document = load(svg('<g transform="scale(2)"><path d="M0 0h10" stroke="red"/></g>'));
    expect(transforms(moveElements(document, ["sk-0"], 10, 4))).toEqual(["translate(5 2)"]);

    const rotated = load(svg('<g transform="rotate(90)"><path d="M0 0h10" stroke="red"/></g>'));
    // Moving right on screen is moving up (-y) in the space of a group rotated by 90°.
    const [turned] = transforms(moveElements(rotated, ["sk-0"], 10, 0));
    expect(turned).toMatch(/^translate\(0 -10\)$/);
  });

  it("moves several layers, leaves the others alone and ignores unknown ids", () => {
    const document = load(
      svg(
        '<g><path d="M0 0h10" stroke="red"/></g><circle cx="5" cy="5" r="2" stroke="red"/><path d="M1 1h4" stroke="red"/>',
      ),
    );
    const result = moveElements(document, ["sk-0", "sk-2", "sk-99"], 1, 2);
    expect(transforms(result)).toEqual(["translate(1 2)", undefined, "translate(1 2)"]);
  });

  it("keeps ids, and does not touch the original document", () => {
    const document = load(svg('<path d="M0 0h10" stroke="red"/><path d="M0 5h10" stroke="red"/>'));
    const before = JSON.stringify(document.root);
    const result = moveElements(document, ["sk-0"], 3, 3);
    expect(load(result).elements.map((element) => element.id)).toEqual(["sk-0", "sk-1"]);
    expect(JSON.stringify(document.root)).toBe(before);
  });

  it("skips layers under a transform that cannot be inverted", () => {
    const document = load(svg('<g transform="scale(0)"><path d="M0 0h10" stroke="red"/></g>'));
    expect(transforms(moveElements(document, ["sk-0"], 5, 5))).toEqual([undefined]);
  });

  it("rounds away floating point noise", () => {
    const document = load(svg('<path d="M0 0h10" stroke="red"/>'));
    expect(transforms(moveElements(document, ["sk-0"], 0.1 + 0.2, 1 / 3))).toEqual([
      "translate(0.3 0.3333)",
    ]);
  });
});

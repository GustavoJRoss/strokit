import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hero } from "@/components/home/hero";
import { OpenSource } from "@/components/home/open-source";
import { Reveal } from "@/components/home/reveal";
import { Support } from "@/components/home/support";
import { site } from "@/lib/site";

describe("Hero", () => {
  it("states what strokit is and links to the editor", () => {
    render(<Hero />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Sua logo em movimento. Em código." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir o editor" })).toHaveAttribute("href", "/editor");
    expect(screen.getByRole("link", { name: "Ver exemplos" })).toHaveAttribute("href", "#exemplos");
    expect(
      screen.getByRole("button", { name: "Reiniciar a animação da marca" }),
    ).toBeInTheDocument();
  });
});

describe("OpenSource", () => {
  it("links to the public repository, its issues and the license", () => {
    render(<OpenSource />);
    expect(screen.getByRole("link", { name: "Ver no GitHub" })).toHaveAttribute(
      "href",
      site.repo.url,
    );
    expect(screen.getByRole("link", { name: "Reportar um problema" })).toHaveAttribute(
      "href",
      site.repo.issuesUrl,
    );
    expect(screen.getByRole("link", { name: "Licença MIT" })).toHaveAttribute(
      "href",
      site.repo.licenseUrl,
    );
    for (const link of screen.getAllByRole("link"))
      expect(link).toHaveAttribute("rel", "noreferrer");
  });
});

describe("Support", () => {
  it("renders an inert donation button while no method is configured", () => {
    expect(site.donationUrl).toBeNull();
    render(<Support />);
    const button = screen.getByRole("button", { name: "Apoiar o projeto" });
    expect(button).toHaveAttribute("type", "button");
    expect(button.closest("a")).toBeNull();
    fireEvent.click(button);
    expect(screen.getByText("Formas de apoio em breve.")).toBeInTheDocument();
  });
});

describe("Reveal", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reveals immediately when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Reveal from="right">conteúdo</Reveal>);
    const element = screen.getByText("conteúdo");
    expect(element).toHaveAttribute("data-reveal", "right");
    expect(element).toHaveAttribute("data-revealed");
  });

  it("reveals once the element intersects, then stops observing", () => {
    let callback: IntersectionObserverCallback = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    render(
      <Reveal from="left" delay={120}>
        bloco
      </Reveal>,
    );
    const element = screen.getByText("bloco");
    expect(element).not.toHaveAttribute("data-revealed");
    expect(element.style.getPropertyValue("--reveal-delay")).toBe("120ms");
    act(() =>
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver),
    );
    expect(element).toHaveAttribute("data-revealed");
    expect(disconnect).toHaveBeenCalled();
  });
});

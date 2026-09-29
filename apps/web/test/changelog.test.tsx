import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChangelogView } from "@/app/changelog/changelog-view";
import { CHANGELOG } from "@/lib/changelog";
import { pt } from "@/lib/i18n/dictionaries/pt";
import { site } from "@/lib/site";

describe("changelog data", () => {
  it("is sorted newest first and has no duplicate ids", () => {
    const dates = CHANGELOG.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(new Set(CHANGELOG.map((entry) => entry.id)).size).toBe(CHANGELOG.length);
  });

  it("every entry has a title and body in the pt dictionary", () => {
    for (const entry of CHANGELOG) {
      expect(pt.changelog[entry.id].title).not.toBe("");
      expect(pt.changelog[entry.id].body).not.toBe("");
    }
  });
});

describe("ChangelogView", () => {
  it("renders the page heading and every entry", () => {
    render(<ChangelogView />);
    expect(screen.getByRole("heading", { level: 1, name: "O que já mudou" })).toBeInTheDocument();
    for (const entry of CHANGELOG) {
      expect(screen.getByText(pt.changelog[entry.id].title)).toBeInTheDocument();
    }
  });

  it("links to the full commit history on GitHub", () => {
    render(<ChangelogView />);
    expect(
      screen.getByRole("link", { name: "Ver o histórico completo de commits no GitHub" }),
    ).toHaveAttribute("href", `${site.repo.url}/commits/main`);
  });
});

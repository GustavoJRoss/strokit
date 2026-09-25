import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home", () => {
  it("renders the product name and a link to the editor", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "strokekit" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir o editor" })).toHaveAttribute("href", "/editor");
  });
});

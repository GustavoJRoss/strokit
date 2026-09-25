"use client";

import { PanelsTopLeftIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type PanelKey, useLayoutControls } from "./editor-layout";

const PANELS: { key: PanelKey; label: string }[] = [
  { key: "layers", label: "Camadas" },
  { key: "params", label: "Parâmetros" },
  { key: "export", label: "Código" },
];

/** Show/hide panels and restore the default layout. Only in the resizable (desktop) layout. */
export function LayoutMenu() {
  const controls = useLayoutControls();
  if (!controls) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="Layout" title="Layout">
          <PanelsTopLeftIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Painéis</DropdownMenuLabel>
        {PANELS.map((panel) => (
          <DropdownMenuCheckboxItem
            key={panel.key}
            checked={!controls.collapsed[panel.key]}
            onCheckedChange={() => controls.toggle(panel.key)}
            onSelect={(event) => event.preventDefault()}
          >
            {panel.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={controls.reset}>
          <RotateCcwIcon />
          Restaurar layout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
import { useI18n } from "@/lib/i18n/provider";
import { type PanelKey, useLayoutControls } from "./editor-layout";

const PANELS: PanelKey[] = ["layers", "params", "export"];

/** Show/hide panels and restore the default layout. Only in the resizable (desktop) layout. */
export function LayoutMenu() {
  const controls = useLayoutControls();
  const { t } = useI18n();
  if (!controls) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label={t.layout.menu} title={t.layout.menu}>
          <PanelsTopLeftIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t.layout.panels}</DropdownMenuLabel>
        {PANELS.map((panel) => (
          <DropdownMenuCheckboxItem
            key={panel}
            checked={!controls.collapsed[panel]}
            onCheckedChange={() => controls.toggle(panel)}
            onSelect={(event) => event.preventDefault()}
          >
            {t.layout.names[panel]}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={controls.reset}>
          <RotateCcwIcon />
          {t.layout.reset}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

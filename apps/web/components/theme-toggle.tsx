"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const OPTIONS = [
  { value: "system", label: "Tema do sistema", Icon: MonitorIcon },
  { value: "light", label: "Tema claro", Icon: SunIcon },
  { value: "dark", label: "Tema escuro", Icon: MoonIcon },
] as const;

/** System / light / dark. The choice is remembered by next-themes (localStorage). */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; render a neutral state until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={mounted ? (theme ?? "system") : ""}
      onValueChange={(value) => value && setTheme(value)}
      aria-label="Tema"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={label} title={label}>
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

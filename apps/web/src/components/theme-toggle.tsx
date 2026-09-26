"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useI18n } from "@/lib/i18n/provider";

const OPTIONS = [
  { value: "system", Icon: MonitorIcon },
  { value: "light", Icon: SunIcon },
  { value: "dark", Icon: MoonIcon },
] as const;

/** System / light / dark. The choice is remembered by next-themes (localStorage). */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
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
      aria-label={t.theme.label}
    >
      {OPTIONS.map(({ value, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={t.theme[value]}
          title={t.theme[value]}
        >
          <Icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isLocale, LOCALES } from "@/lib/i18n/locales";
import { useI18n } from "@/lib/i18n/provider";

/** Language names are always shown in their own language. */
const NAMES = { pt: "Português", en: "English", es: "Español" } as const;

const THEMES = [
  { value: "system", Icon: MonitorIcon },
  { value: "light", Icon: SunIcon },
  { value: "dark", Icon: MoonIcon },
] as const;

/**
 * One small button for the site-wide preferences (language and theme), shared by every header.
 * The button shows the current theme icon and language code; the choices live in a popover.
 */
export function PreferencesMenu() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; render a neutral state until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = THEMES.find((option) => option.value === (mounted ? theme : "system"));
  const CurrentIcon = current?.Icon ?? MonitorIcon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={t.preferences.label}
          title={t.preferences.label}
        >
          <CurrentIcon data-icon="inline-start" />
          <span className="font-mono text-xs uppercase">{locale}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-sm">{t.language.label}</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={locale}
            onValueChange={(value) => isLocale(value) && setLocale(value)}
            aria-label={t.language.label}
            className="w-full"
          >
            {LOCALES.map((code) => (
              <ToggleGroupItem key={code} value={code} lang={code} className="flex-1">
                {NAMES[code]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-sm">{t.theme.label}</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={mounted ? (theme ?? "system") : ""}
            onValueChange={(value) => value && setTheme(value)}
            aria-label={t.theme.label}
            className="w-full"
          >
            {THEMES.map(({ value, Icon }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                aria-label={t.theme[value]}
                title={t.theme[value]}
                className="flex-1"
              >
                <Icon />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
}

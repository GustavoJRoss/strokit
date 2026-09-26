"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { type Dictionary, pt } from "./dictionaries/pt";
import {
  DEFAULT_LOCALE,
  detectLocale,
  HTML_LANG,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./locales";

export const DICTIONARIES: Record<Locale, Dictionary> = { pt, en, es };

type I18n = { locale: Locale; t: Dictionary; setLocale: (locale: Locale) => void };

const I18nContext = createContext<I18n>({ locale: DEFAULT_LOCALE, t: pt, setLocale: () => {} });

function storedLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Client-side language switching on the same URLs. The static HTML is Portuguese; before the
 * first paint the provider switches to the remembered choice or the browser's language.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useLayoutEffect(() => {
    setLocaleState(storedLocale() ?? detectLocale(navigator.languages ?? [navigator.language]));
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
    document.documentElement.classList.remove("i18n-pending");
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // The choice lasts until the page closes.
    }
    setLocaleState(next);
  }, []);

  const value = useMemo(
    () => ({ locale, t: DICTIONARIES[locale], setLocale }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}

/**
 * The page title in the current language. React 19 hoists <title> into <head>; pages don't set
 * a metadata title, so this is the only one (Portuguese in the static HTML, then the visitor's).
 */
export function DocumentTitle({ page }: { page: keyof Dictionary["meta"]["titles"] }) {
  const { t } = useI18n();
  return <title>{t.meta.titles[page]}</title>;
}

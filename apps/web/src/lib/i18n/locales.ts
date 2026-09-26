export const LOCALES = ["pt", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/** Language of the statically generated HTML (the first paint before the client picks one). */
export const DEFAULT_LOCALE: Locale = "pt";
/** For browsers that prefer none of the supported languages. */
export const FALLBACK_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "strokit:locale";

export const HTML_LANG: Record<Locale, string> = { pt: "pt-BR", en: "en", es: "es" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** First supported language in the browser's preference list ("pt-BR" → "pt"); otherwise English. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primary = language.slice(0, 2).toLowerCase();
    if (isLocale(primary)) return primary;
  }
  return FALLBACK_LOCALE;
}

/**
 * Runs inline in <head> before the first paint (keep it in sync with detectLocale): when the
 * visitor's language is not the one baked into the HTML, the page stays hidden until React has
 * swapped the texts (with a safety timeout), so Portuguese never flashes for other languages.
 */
export const LOCALE_BOOT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');try{var s=localStorage.getItem('${LOCALE_STORAGE_KEY}');var ok=['pt','en','es'];var l=ok.indexOf(s)>=0?s:null;if(!l){var ls=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''];for(var i=0;i<ls.length&&!l;i++){var c=String(ls[i]).slice(0,2).toLowerCase();if(ok.indexOf(c)>=0)l=c}l=l||'${FALLBACK_LOCALE}'}if(l!=='${DEFAULT_LOCALE}'){d.classList.add('i18n-pending');d.lang=l;setTimeout(function(){d.classList.remove('i18n-pending')},800)}}catch(e){}})();`;

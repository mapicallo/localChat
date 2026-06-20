const LOCALE_KEY = 'lc_locale';

export type Locale = 'en' | 'es';

export async function loadLocale(): Promise<Locale> {
  try {
    const data = await chrome.storage.local.get(LOCALE_KEY);
    const v = data[LOCALE_KEY];
    return v === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export async function saveLocale(locale: Locale): Promise<void> {
  await chrome.storage.local.set({ [LOCALE_KEY]: locale });
}

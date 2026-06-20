/** Opens the extension privacy policy with the UI locale. */
import type { Locale } from './storage.js';

export function getPrivacyPageUrl(locale: Locale): string {
  return chrome.runtime.getURL(`privacy.html?lang=${locale}`);
}

export function openPrivacyPolicy(locale: Locale): void {
  void chrome.tabs.create({ url: getPrivacyPageUrl(locale) });
}

import en from "./en.json";
import zh from "./zh.json";

type Lang = "en" | "zh";

const messages: Record<string, Record<string, string>> = { en, zh };

let currentLang: Lang = "en";

export function setLang(lang: Lang) {
  currentLang = lang;
}

export function getLang(): Lang {
  return currentLang;
}

export function t(key: string): string {
  const dict = messages[currentLang] || messages.en;
  return dict[key] || key;
}

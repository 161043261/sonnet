import type { Lang } from "@/sdk/types";
import en from "./en.json";
import zh from "./zh.json";

const messages: Record<string, Record<string, unknown>> = { en, zh };

let currentLang: Lang = "zh";

export function setLang(lang: Lang) {
  currentLang = lang;
}

export function getLang(): Lang {
  return currentLang;
}

function getByPath(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

export function t(key: string, params?: Record<string, unknown>): string {
  const dict = messages[currentLang] || messages.en;
  let text = getByPath(dict, key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    }
  }
  return text;
}

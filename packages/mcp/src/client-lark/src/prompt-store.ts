import { defineStore } from "@lark.js/mvc";
import { t, setLang, getLang } from "@/locales/i18n";

type Lang = "en" | "zh";

interface PromptStoreAPI {
  name: string;
  description: string;
  content: string;
  status: string;
  lang: Lang;

  setName: (val: string) => void;
  setDescription: (val: string) => void;
  setContent: (val: string) => void;
  submitForm: () => void;
  changeLang: () => void;
  clearStatus: () => void;
}

export const usePromptStore = defineStore<PromptStoreAPI>("prompt", (store) => {
  let statusTimer: ReturnType<typeof setTimeout> | null = null;

  function setName(val: string) {
    store.name = val;
  }

  function setDescription(val: string) {
    store.description = val;
  }

  function setContent(val: string) {
    store.content = val;
  }

  async function submitForm() {
    store.status = t("saving");

    try {
      const response = await fetch("/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: store.name,
          description: store.description,
          content: store.content,
        }),
      });

      if (response.ok) {
        store.status = t("success_message");
        store.name = "";
        store.description = "";
        store.content = "";
      } else {
        const data = (await response.json()) as { error?: string };
        store.status = `${t("error_message")}: ${data.error || "Failed to create prompt"}`;
      }
    } catch {
      store.status = t("network_error");
    }

    // Auto-clear status after 10 seconds (unless still saving)
    if (store.status !== t("saving")) {
      if (statusTimer) clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        store.status = "";
      }, 10_000);
    }
  }

  function changeLang() {
    const nextLang = store.lang === "en" ? "zh" : "en";
    store.lang = nextLang;
    setLang(nextLang);
  }

  function clearStatus() {
    store.status = "";
  }

  return {
    name: "",
    description: "",
    content: "",
    status: "",
    lang: getLang(),
    setName,
    setDescription,
    setContent,
    submitForm,
    changeLang,
    clearStatus,
  };
});

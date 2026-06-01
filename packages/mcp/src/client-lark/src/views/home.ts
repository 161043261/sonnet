import { View } from "@lark.js/mvc";
import template from "./home.html";
import { usePromptStore } from "@/prompt-store";
import { t } from "@/locales/i18n";

export default View.extend({
  template,

  init() {
    const store = usePromptStore(this);

    const syncToView = () => {
      const s = usePromptStore();
      this.updater.digest({
        appTitle: t("app_title"),
        appSubtitle: t("app_subtitle"),
        switchLang: t("switch_lang"),
        lang: s.lang || "en",
      });
    };

    store.observe(this, ["lang"], syncToView);
    syncToView();
  },

  "onToggleLang<click>"() {
    usePromptStore().changeLang();
  },
});

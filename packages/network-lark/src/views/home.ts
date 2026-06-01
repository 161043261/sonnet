import { View } from "@lark.js/mvc";
import template from "./home.html";
import { useDiagnoseStore } from "@/diagnose-store";
import { t } from "@/locales/i18n";

export default View.extend({
  template,

  init() {
    const store = useDiagnoseStore(this);

    const syncToView = () => {
      const s = useDiagnoseStore();
      this.updater.digest({
        title: t("ui.title"),
        lang: s.lang || "zh",
        langLabel: s.lang === "zh" ? "中文" : "English",
      });
    };

    store.observe(this, ["lang"], syncToView);
    syncToView();
  },

  "onChangeLangZh<click>"() {
    useDiagnoseStore().changeLang("zh");
  },

  "onChangeLangEn<click>"() {
    useDiagnoseStore().changeLang("en");
  },
});

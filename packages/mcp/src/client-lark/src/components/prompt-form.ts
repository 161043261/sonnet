import { View } from "@lark.js/mvc";
import template from "./prompt-form.html";
import { usePromptStore } from "@/prompt-store";
import { t } from "@/locales/i18n";

export default View.extend({
  template,

  init() {
    const store = usePromptStore(this);

    const syncToView = () => {
      const s = usePromptStore();
      const isSaving = s.status === t("saving");
      const hasStatus = !!s.status && !isSaving;
      const isError = hasStatus && s.status.includes(t("error_message"));

      this.updater.digest({
        name: s.name || "",
        description: s.description || "",
        content: s.content || "",
        status: s.status || "",
        isSaving,
        hasStatus,
        isError,
        formTitle: t("form_title"),
        promptNameLabel: t("prompt_name_label"),
        promptNamePlaceholder: t("prompt_name_placeholder"),
        descriptionLabel: t("description_label"),
        descriptionPlaceholder: t("description_placeholder"),
        contentLabel: t("content_label"),
        contentPlaceholder: t("content_placeholder"),
        saveButton: t("save_button"),
        savingLabel: t("saving"),
      });
    };

    store.observe(
      this,
      ["name", "description", "content", "status", "lang"],
      syncToView,
    );
    syncToView();
  },

  "onNameInput<input>"(e: Record<string, unknown>) {
    const target = e.eventTarget as HTMLInputElement | null;
    if (target) usePromptStore().setName(target.value);
  },

  "onDescriptionInput<input>"(e: Record<string, unknown>) {
    const target = e.eventTarget as HTMLInputElement | null;
    if (target) usePromptStore().setDescription(target.value);
  },

  "onContentInput<input>"(e: Record<string, unknown>) {
    const target = e.eventTarget as HTMLTextAreaElement | null;
    if (target) usePromptStore().setContent(target.value);
  },

  "onSubmit<submit>"(e: Record<string, unknown>) {
    e.preventDefault?.();
    void usePromptStore().submitForm();
  },
});

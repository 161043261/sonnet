import { View } from "@lark.js/mvc";
import template from "./search.html";
import type { SearchResult } from "@/types";
import { useSearchStore } from "@/search-store";
import { getNextActiveIndex, getPreviousActiveIndex } from "@/utils/state";
import { highlightText } from "@/utils/highlight";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
  });
}

export default View.extend({
  template,

  init() {
    const store = useSearchStore(this);

    // Sync store state → updater (used for both initial render and reactive updates)
    const syncToView = () => {
      const s = useSearchStore();
      const trimmedQuery = s.trimmedQuery || "";
      const status = s.status || "idle";

      const displayResults = (s.results || []).map((item: SearchResult) => ({
        ...item,
        highlightedTitle: highlightText(item.title, trimmedQuery),
        highlightedDescription: highlightText(item.description, trimmedQuery),
        formattedDate: formatDate(item.updatedAt),
      }));

      this.updater.digest({
        isOpen: s.isOpen || false,
        query: s.query || "",
        trimmedQuery,
        results: displayResults,
        total: s.total || 0,
        status,
        errorMessage: s.errorMessage || "",
        activeIndex: s.activeIndex || 0,
        fromCache: s.fromCache || false,
        isRefreshing: s.isRefreshing || false,
        isLoading: status === "loading",
        canShowResults:
          s.isOpen && trimmedQuery.length > 0 && status !== "idle",
      });

      // Focus input when search opens (matches React version)
      if (s.isOpen) {
        setTimeout(() => {
          const input = document.getElementById(
            "search-input",
          ) as HTMLInputElement | null;
          if (input) input.focus();
        }, 80);
      }
    };

    // Observe store state changes → sync to view
    store.observe(
      this,
      [
        "isOpen",
        "query",
        "trimmedQuery",
        "results",
        "total",
        "status",
        "errorMessage",
        "activeIndex",
        "fromCache",
        "isRefreshing",
      ],
      syncToView,
    );

    // Initial sync — store.observe defCallback only fires on changes,
    // not on initial registration, so we must push initial data manually.
    syncToView();

    // Global keyboard handler (Cmd/Ctrl+P, Escape, Arrow, Enter)
    const handleKeydown = (e: KeyboardEvent) => {
      const isSearchShortcut =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p";
      if (isSearchShortcut) {
        e.preventDefault();
        store.openSearch();
        return;
      }

      const currentStore = useSearchStore();
      if (!currentStore.isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        currentStore.closeSearch();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        currentStore.setActiveIndex(
          getNextActiveIndex(
            currentStore.activeIndex,
            currentStore.results.length,
          ),
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        currentStore.setActiveIndex(
          getPreviousActiveIndex(
            currentStore.activeIndex,
            currentStore.results.length,
          ),
        );
        return;
      }

      if (e.key === "Enter") {
        const results = currentStore.results;
        const selectedResult = results[currentStore.activeIndex];
        if (selectedResult) {
          e.preventDefault();
          currentStore.selectResult(selectedResult);
        }
      }
    };
    document.addEventListener("keydown", handleKeydown);

    // Click outside to close (matches React version: blur + closeSearch)
    const viewId = this.id;
    const handlePointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;
      const root = document.getElementById(viewId);
      if (root && root.contains(e.target)) return;

      const input = document.getElementById(
        "search-input",
      ) as HTMLInputElement | null;
      if (input) input.blur();
      store.closeSearch();
    };
    document.addEventListener("pointerdown", handlePointerDown);

    // Cleanup on destroy
    this.on("destroy", () => {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("pointerdown", handlePointerDown);
    });
  },

  "onQueryInput<input>"() {
    const input = document.getElementById(
      "search-input",
    ) as HTMLInputElement | null;
    if (input) {
      useSearchStore().setQuery(input.value);
    }
  },

  "onSearchFocus<focusin>"() {
    useSearchStore().openSearch();
  },

  "onClearQuery<click>"() {
    useSearchStore().setQuery("");
  },

  "onSelectResult<click>"(e: Record<string, unknown>) {
    const params = e.params as Record<string, string> | undefined;
    if (!params) return;
    const id = params.id;
    const store = useSearchStore();
    const result = store.results.find((r: SearchResult) => r.id === id);
    if (result) store.selectResult(result);
  },

  "onHoverResult<mouseenter>"(e: Record<string, unknown>) {
    const params = e.params as Record<string, string> | undefined;
    if (!params) return;
    const index = Number(params.index);
    if (!isNaN(index)) useSearchStore().setActiveIndex(index);
  },

  "onRetry<click>"() {
    useSearchStore().retry();
  },
});

import { defineStore } from "@lark.js/mvc";
import type { SearchResult, SearchStatus } from "@/types";
import { defaultCacheTtlSeconds, defaultDebounceMs } from "@/utils/constants";
import {
  cleanupSearchCache,
  getCachedSearch,
  setCachedSearch,
} from "@/utils/cache";
import {
  getErrorMessage,
  isAbortError,
  parseSearchResponse,
  readErrorMessage,
} from "@/utils/response";
import { areSameResults } from "@/utils/results";
import { clampActiveIndex, getSearchStatus } from "@/utils/state";

interface SearchStoreAPI {
  isOpen: boolean;
  query: string;
  trimmedQuery: string;
  results: SearchResult[];
  total: number;
  status: SearchStatus;
  errorMessage: string;
  activeIndex: number;
  fromCache: boolean;
  isRefreshing: boolean;

  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (value: string) => void;
  setActiveIndex: (index: number) => void;
  selectResult: (result: SearchResult) => void;
  retry: () => void;
}

export const useSearchStore = defineStore<SearchStoreAPI>("search", (store) => {
  let controller: AbortController | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let requestVersion = 0;

  function cancelRequest() {
    requestVersion += 1;
    controller?.abort();
  }

  function updateResults(items: SearchResult[], nextTotal: number) {
    store.results = items;
    store.total = nextTotal;
    store.activeIndex = clampActiveIndex(store.activeIndex, items.length);
  }

  async function runSearch(searchTerm: string, preferCache: boolean) {
    const cacheTtlMs = defaultCacheTtlSeconds * 1000;
    const key = searchTerm.toLowerCase();

    cleanupSearchCache(cacheTtlMs);
    store.errorMessage = "";

    const cached = getCachedSearch(key, cacheTtlMs);
    if (preferCache && cached) {
      updateResults(cached.items, cached.total);
      store.status = getSearchStatus(cached.items);
      store.fromCache = true;
      store.isRefreshing = true;
    } else {
      store.status = "loading";
      store.fromCache = false;
      store.isRefreshing = false;
    }

    cancelRequest();
    controller = new AbortController();
    const currentVersion = requestVersion;

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchTerm)}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = parseSearchResponse(await response.json());
      if (currentVersion !== requestVersion) return;

      if (!areSameResults(store.results, data.items)) {
        updateResults(data.items, data.total);
      }

      setCachedSearch(key, data.items, data.total, cacheTtlMs);
      store.status = getSearchStatus(data.items);
      store.fromCache = false;
      store.errorMessage = "";
    } catch (error) {
      if (isAbortError(error) || currentVersion !== requestVersion) return;

      const errMsg = getErrorMessage(error);
      store.errorMessage = errMsg;
      if (!cached) {
        updateResults([], 0);
        store.status = "error";
      } else {
        store.status = getSearchStatus(cached.items);
      }
    } finally {
      if (currentVersion === requestVersion) {
        store.isRefreshing = false;
      }
    }
  }

  function resetSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    cancelRequest();
    store.results = [];
    store.total = 0;
    store.activeIndex = clampActiveIndex(0, 0);
    store.status = "idle";
    store.errorMessage = "";
    store.fromCache = false;
    store.isRefreshing = false;
  }

  function openSearch() {
    store.isOpen = true;
  }

  function closeSearch() {
    store.isOpen = false;
    store.activeIndex = 0;
  }

  function setQuery(value: string) {
    const trimmed = value.trim();

    if (debounceTimer) clearTimeout(debounceTimer);

    if (trimmed.length === 0) {
      store.query = value;
      store.trimmedQuery = "";
      resetSearch();
      return;
    }

    store.query = value;
    store.trimmedQuery = trimmed;

    debounceTimer = setTimeout(() => {
      void runSearch(trimmed, true);
    }, defaultDebounceMs);
  }

  function setActiveIndex(index: number) {
    store.activeIndex = clampActiveIndex(index, store.results.length);
  }

  function selectResult(result: SearchResult) {
    window.history.pushState(null, "", result.url);
    closeSearch();
  }

  function retry() {
    if (store.trimmedQuery.length === 0) return;
    void runSearch(store.trimmedQuery, false);
  }

  return {
    isOpen: false,
    query: "",
    trimmedQuery: "",
    results: [] as SearchResult[],
    total: 0,
    status: "idle" as SearchStatus,
    errorMessage: "",
    activeIndex: 0,
    fromCache: false,
    isRefreshing: false,
    openSearch,
    closeSearch,
    setQuery,
    setActiveIndex,
    selectResult,
    retry,
  };
});

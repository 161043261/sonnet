import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SearchActions,
  SearchResult,
  SearchStatus,
  SearchViewState,
  UseGlobalSearchOptions,
} from "@/types";
import {
  defaultCacheTtlSeconds,
  defaultDebounceMs,
} from "./global-search/constants";
import { createGlobalSearchKeydownHandler } from "./global-search/keyboard";
import { runGlobalSearch } from "./global-search/search-runner";
import { clampActiveIndex } from "./global-search/state";

export function useGlobalSearch(options: UseGlobalSearchOptions = {}) {
  const cacheTtlMs = (options.cacheTtlSeconds ?? defaultCacheTtlSeconds) * 1000;
  const debounceMs = options.debounceMs ?? defaultDebounceMs;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResultsState] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeIndex, setActiveIndexState] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestVersionRef = useRef(0);
  const resultsRef = useRef<SearchResult[]>([]);
  const isOpenRef = useRef(false);
  const activeIndexRef = useRef(0);

  const trimmedQuery = query.trim();
  const isLoading = status === "loading";
  const canShowResults = isOpen && trimmedQuery.length > 0 && status !== "idle";

  const setResults = useCallback((items: SearchResult[], nextTotal: number) => {
    resultsRef.current = items;
    setResultsState(items);
    setTotal(nextTotal);
    setActiveIndexState((current) => {
      const nextIndex = clampActiveIndex(current, items.length);
      activeIndexRef.current = nextIndex;
      return nextIndex;
    });
  }, []);

  const cancelRequest = useCallback(() => {
    requestVersionRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  const resetSearch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    cancelRequest();
    setResults([], 0);
    setStatus("idle");
    setErrorMessage("");
    setFromCache(false);
    setIsRefreshing(false);
  }, [cancelRequest, setResults]);

  const openSearch = useCallback(() => {
    isOpenRef.current = true;
    setIsOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    isOpenRef.current = false;
    setIsOpen(false);
    activeIndexRef.current = 0;
    setActiveIndexState(0);
  }, []);

  const setActiveIndex = useCallback((index: number) => {
    const length = resultsRef.current.length;
    const nextIndex = clampActiveIndex(index, length);
    activeIndexRef.current = nextIndex;
    setActiveIndexState(nextIndex);
  }, []);

  const selectResult = useCallback(
    (result: SearchResult) => {
      options.onSelect?.(result);
      closeSearch();
    },
    [closeSearch, options],
  );

  const runSearch = useCallback(
    async (searchTerm: string, preferCache: boolean) => {
      await runGlobalSearch(searchTerm, preferCache, {
        cacheTtlMs,
        controllerRef,
        requestVersionRef,
        resultsRef,
        cancelRequest,
        setResults,
        setStatus,
        setErrorMessage,
        setFromCache,
        setIsRefreshing,
      });
    },
    [cacheTtlMs, cancelRequest, setResults],
  );

  const retry = useCallback(() => {
    if (trimmedQuery.length === 0) return;
    void runSearch(trimmedQuery, false);
  }, [runSearch, trimmedQuery]);

  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndexState(0);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (trimmedQuery.length === 0) {
      resetSearch();
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      void runSearch(trimmedQuery, true);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [debounceMs, resetSearch, runSearch, trimmedQuery]);

  useEffect(() => {
    const handleKeyDown = createGlobalSearchKeydownHandler({
      isOpenRef,
      resultsRef,
      activeIndexRef,
      setActiveIndex: setActiveIndexState,
      openSearch,
      closeSearch,
      selectResult,
    });

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSearch, openSearch, selectResult]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      cancelRequest();
    };
  }, [cancelRequest]);

  const state: SearchViewState = {
    isOpen,
    query,
    trimmedQuery,
    results,
    total,
    status,
    errorMessage,
    activeIndex,
    fromCache,
    isRefreshing,
    isLoading,
    canShowResults,
  };

  const actions: SearchActions = useMemo(
    () => ({
      openSearch,
      closeSearch,
      setQuery,
      setActiveIndex,
      selectResult,
      retry,
    }),
    [closeSearch, openSearch, retry, selectResult, setActiveIndex],
  );

  return {
    state,
    actions,
  };
}

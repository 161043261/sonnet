import type { Dispatch, SetStateAction } from "react";
import type { SearchResult, SearchStatus } from "@/types";
import { cleanupSearchCache, getCachedSearch, setCachedSearch } from "./cache";
import {
  getErrorMessage,
  isAbortError,
  parseSearchResponse,
  readErrorMessage,
} from "./response";
import { areSameResults } from "./results";
import { getSearchStatus } from "./state";

interface CurrentRef<T> {
  current: T;
}

interface SearchRunnerOptions {
  cacheTtlMs: number;
  controllerRef: CurrentRef<AbortController | null>;
  requestVersionRef: CurrentRef<number>;
  resultsRef: CurrentRef<SearchResult[]>;
  cancelRequest: () => void;
  setResults: (items: SearchResult[], total: number) => void;
  setStatus: Dispatch<SetStateAction<SearchStatus>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setFromCache: Dispatch<SetStateAction<boolean>>;
  setIsRefreshing: Dispatch<SetStateAction<boolean>>;
}

export async function runGlobalSearch(
  searchTerm: string,
  preferCache: boolean,
  {
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
  }: SearchRunnerOptions,
) {
  const key = searchTerm.toLowerCase();

  cleanupSearchCache(cacheTtlMs);
  setErrorMessage("");

  const cached = getCachedSearch(key, cacheTtlMs);
  if (preferCache && cached) {
    setResults(cached.items, cached.total);
    setStatus(getSearchStatus(cached.items));
    setFromCache(true);
    setIsRefreshing(true);
  } else {
    setStatus("loading");
    setFromCache(false);
    setIsRefreshing(false);
  }

  cancelRequest();
  controllerRef.current = new AbortController();
  const currentVersion = requestVersionRef.current;

  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(searchTerm)}`,
      {
        signal: controllerRef.current.signal,
      },
    );

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const data = parseSearchResponse(await response.json());
    if (currentVersion !== requestVersionRef.current) return;

    if (!areSameResults(resultsRef.current, data.items)) {
      setResults(data.items, data.total);
    }

    setCachedSearch(key, data.items, data.total, cacheTtlMs);
    setStatus(getSearchStatus(data.items));
    setFromCache(false);
    setErrorMessage("");
  } catch (error) {
    if (isAbortError(error) || currentVersion !== requestVersionRef.current) {
      return;
    }

    setErrorMessage(getErrorMessage(error));
    if (!cached) {
      setResults([], 0);
      setStatus("error");
    } else {
      setStatus(getSearchStatus(cached.items));
    }
  } finally {
    if (currentVersion === requestVersionRef.current) {
      setIsRefreshing(false);
    }
  }
}

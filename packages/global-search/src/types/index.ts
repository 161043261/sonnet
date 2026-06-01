import z from "zod";

export interface ValueRef<T> {
  value: T;
}

export const SearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  url: z.string(),
  tags: z.array(z.string()),
  updatedAt: z.string(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  items: z.array(SearchResultSchema),
  total: z.number(),
  query: z.string(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface UseGlobalSearchOptions {
  cacheTtlSeconds?: number;
  debounceMs?: number;
  onSelect?: (result: SearchResult) => void;
}

export interface CacheEntry {
  items: SearchResult[];
  total: number;
  updatedAt: number;
}

export interface SearchViewState {
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
  isLoading: boolean;
  canShowResults: boolean;
}

export interface SearchActions {
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (value: string) => void;
  setActiveIndex: (index: number) => void;
  selectResult: (result: SearchResult) => void;
  retry: () => void;
}

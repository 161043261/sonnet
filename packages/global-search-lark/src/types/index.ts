export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  tags: string[];
  updatedAt: string;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  query: string;
}

export type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

export interface CacheEntry {
  items: SearchResult[];
  total: number;
  updatedAt: number;
}

export interface DisplayResultItem extends SearchResult {
  highlightedTitle: string;
  highlightedDescription: string;
  formattedDate: string;
}

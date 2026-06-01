import type { SearchResult, SearchStatus } from "@/types";

export function getSearchStatus(items: SearchResult[]): SearchStatus {
  return items.length > 0 ? "success" : "empty";
}

export function clampActiveIndex(index: number, length: number) {
  if (length === 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

export function getNextActiveIndex(current: number, length: number) {
  return length > 0 ? (current + 1) % length : 0;
}

export function getPreviousActiveIndex(current: number, length: number) {
  return length > 0 ? (current - 1 + length) % length : 0;
}

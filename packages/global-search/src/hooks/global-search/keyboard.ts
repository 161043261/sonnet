import type { Dispatch, SetStateAction } from "react";
import type { SearchResult } from "@/types";
import { getNextActiveIndex, getPreviousActiveIndex } from "./state";

interface CurrentRef<T> {
  current: T;
}

interface KeyboardHandlerOptions {
  isOpenRef: CurrentRef<boolean>;
  resultsRef: CurrentRef<SearchResult[]>;
  activeIndexRef: CurrentRef<number>;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  openSearch: () => void;
  closeSearch: () => void;
  selectResult: (result: SearchResult) => void;
}

function updateActiveIndex(
  activeIndexRef: CurrentRef<number>,
  setActiveIndex: Dispatch<SetStateAction<number>>,
  nextIndex: number,
) {
  activeIndexRef.current = nextIndex;
  setActiveIndex(nextIndex);
}

export function createGlobalSearchKeydownHandler({
  isOpenRef,
  resultsRef,
  activeIndexRef,
  setActiveIndex,
  openSearch,
  closeSearch,
  selectResult,
}: KeyboardHandlerOptions) {
  return (event: KeyboardEvent) => {
    const isSearchShortcut =
      (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p";

    if (isSearchShortcut) {
      event.preventDefault();
      openSearch();
      return;
    }

    if (!isOpenRef.current) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      updateActiveIndex(
        activeIndexRef,
        setActiveIndex,
        getNextActiveIndex(activeIndexRef.current, resultsRef.current.length),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      updateActiveIndex(
        activeIndexRef,
        setActiveIndex,
        getPreviousActiveIndex(
          activeIndexRef.current,
          resultsRef.current.length,
        ),
      );
      return;
    }

    if (event.key === "Enter") {
      const selectedResult = resultsRef.current[activeIndexRef.current];
      if (!selectedResult) return;

      event.preventDefault();
      selectResult(selectedResult);
    }
  };
}

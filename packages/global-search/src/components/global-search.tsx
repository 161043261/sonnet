import { useCallback, useEffect, useMemo, useRef } from "react";
import { useGlobalSearch } from "@/hooks/use-global-search";
import type { SearchResult } from "@/types";
import { Input } from "./input";
import { Results } from "./results";

interface IProps {
  cacheTtlSeconds?: number;
  onSelect?: (result: SearchResult) => void;
}

export function GlobalSearch({ cacheTtlSeconds = 30, onSelect }: IProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (onSelect) {
        onSelect(result);
        return;
      }

      window.history.pushState(null, "", result.url);
    },
    [onSelect],
  );

  const searchOptions = useMemo(
    () => ({
      cacheTtlSeconds,
      onSelect: handleSelect,
    }),
    [cacheTtlSeconds, handleSelect],
  );

  const { state, actions } = useGlobalSearch(searchOptions);

  useEffect(() => {
    if (!state.isOpen) {
      inputRef.current?.blur();
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [state.isOpen]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target)) return;

      inputRef.current?.blur();
      actions.closeSearch();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [actions]);

  return (
    <div ref={rootRef} className="w-full">
      <div
        className={`mx-auto transition-all duration-300 ease-out ${
          state.isOpen ? "max-w-2xl" : "max-w-xl"
        }`}
      >
        <div
          className={`bg-base-100 rounded-2xl border p-2 shadow-sm transition-all duration-300 ${
            state.isOpen
              ? "border-primary/40 ring-primary/10 ring-2"
              : "border-base-300 hover:border-primary/30"
          }`}
        >
          <Input inputRef={inputRef} state={state} actions={actions} />
          <Results state={state} actions={actions} />
        </div>
      </div>
    </div>
  );
}

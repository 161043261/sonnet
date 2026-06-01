import { type SearchResponse, SearchResponseSchema } from "@/types";

export function parseSearchResponse(value: unknown): SearchResponse {
  const parsed = SearchResponseSchema.safeParse(value);
  if (parsed.success) return parsed.data;

  return {
    items: [],
    total: 0,
    query: "",
  };
}

export async function readErrorMessage(response: Response) {
  const fallback = `Request failed with status ${response.status}`;

  try {
    const value: unknown = await response.json();
    if (
      typeof value === "object" &&
      value !== null &&
      "message" in value &&
      typeof value.message === "string"
    ) {
      return value.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "A network error occurred. Please try again later.";
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightText(text: string, query: string): string {
  const terms = Array.from(
    new Set(query.trim().split(/\s+/).filter(Boolean)),
  ).sort((left, right) => right.length - left.length);

  if (terms.length === 0) return escapeHtml(text);

  const matcher = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const result: string[] = [];
  let cursor = 0;

  for (const match of text.matchAll(matcher)) {
    const matchIndex = match.index;
    const matchedText = match[0];

    if (matchIndex === undefined) continue;
    if (matchIndex > cursor) {
      result.push(escapeHtml(text.slice(cursor, matchIndex)));
    }

    result.push(
      `<mark class="rounded bg-blue-100 px-0.5 text-blue-700">${escapeHtml(matchedText)}</mark>`,
    );

    cursor = matchIndex + matchedText.length;
  }

  if (cursor < text.length) result.push(escapeHtml(text.slice(cursor)));

  return result.join("");
}

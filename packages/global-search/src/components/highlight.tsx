import type { ReactNode } from "react";

interface IProps {
  text: string;
  query: string;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Highlight({ text, query }: IProps) {
  const terms = Array.from(
    new Set(query.trim().split(/\s+/).filter(Boolean)),
  ).sort((left, right) => right.length - left.length);

  if (terms.length === 0) return <>{text}</>;

  const matcher = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(matcher)) {
    const matchIndex = match.index;
    const matchedText = match[0];

    if (matchIndex === undefined) continue;
    if (matchIndex > cursor) {
      nodes.push(text.slice(cursor, matchIndex));
    }

    nodes.push(
      <mark
        key={`${matchIndex}-${matchedText}`}
        className="rounded bg-blue-100 px-0.5 text-blue-700"
      >
        {matchedText}
      </mark>,
    );

    cursor = matchIndex + matchedText.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));

  return <>{nodes}</>;
}

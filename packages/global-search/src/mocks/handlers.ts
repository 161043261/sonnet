import { faker } from "@faker-js/faker";
import { delay, http, HttpResponse } from "msw";
import type { SearchResponse, SearchResult } from "@/types";
import packageJson from "../../package.json";

faker.seed(20260509);
faker.setDefaultRefDate("2026-05-09T00:00:00.000Z");

const deps = [
  ...Object.keys(packageJson.dependencies),
  ...Object.keys(packageJson.devDependencies),
];

const topics = [
  packageJson.name,
  ...packageJson.keywords,
  ...Object.keys(packageJson.scripts),
  "command palette",
  "keyboard navigation",
  "result cache",
  "mock service worker",
  "highlight keyword",
];

const pages = [
  "/",
  "/docs/search",
  "/docs/keyboard",
  "/docs/cache",
  "/docs/mocks",
];

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

const seedItems: SearchResult[] = [
  {
    id: "seed-global-search",
    title: "Global search command palette",
    description:
      "Open search with Cmd or Ctrl + P, navigate results with arrows, and confirm with Enter.",
    category: "interaction",
    url: "/docs/search",
    tags: ["global", "search", "command palette"],
    updatedAt: "2026-05-08T08:00:00.000Z",
  },
  {
    id: "seed-cache",
    title: "Stale while revalidate result cache",
    description:
      "Show cached results immediately, refresh in the background, and prune expired search entries.",
    category: "performance",
    url: "/docs/cache",
    tags: ["cache", "swr", "performance"],
    updatedAt: "2026-05-07T08:00:00.000Z",
  },
  {
    id: "seed-msw",
    title: "MSW browser mock search API",
    description:
      "Mock the /api/search endpoint with predictable faker data for local development.",
    category: "mock",
    url: "/docs/mocks",
    tags: ["msw", "faker", "api"],
    updatedAt: "2026-05-06T08:00:00.000Z",
  },
];

const generatedItems: SearchResult[] = Array.from({ length: 10_000 }, () => {
  const topic = faker.helpers.arrayElement(topics);
  const category = faker.helpers.arrayElement(deps);
  const title = `${faker.hacker.verb()} ${topic} ${faker.hacker.noun()}`;
  const tags = faker.helpers.arrayElements(topics, { min: 2, max: 5 });

  return {
    id: faker.string.uuid(),
    title: capitalize(title),
    description: faker.helpers.arrayElement([
      `Quickly locate ${topic} capabilities and examples in the ${packageJson.name}.`,
      `${topic} usage notes, interaction details, and implementation entry points for ${category}.`,
      `Explore how ${topic} works with ${category}, and mocked data flows.`,
    ]),
    category,
    url: faker.helpers.arrayElement(pages),
    tags,
    updatedAt: faker.date.recent({ days: 30 }).toISOString(),
  };
});

const searchItems = [...seedItems, ...generatedItems];

function rankItem(item: SearchResult, words: string[]) {
  const title = item.title.toLowerCase();
  const description = item.description.toLowerCase();
  const category = item.category.toLowerCase();
  const tags = item.tags.join(" ").toLowerCase();

  return words.reduce((score, word) => {
    if (title.includes(word)) return score + 8;
    if (category.includes(word)) return score + 5;
    if (tags.includes(word)) return score + 3;
    if (description.includes(word)) return score + 1;
    return score;
  }, 0);
}

export const handlers = [
  http.get("/api/search", async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const normalizedQuery = query.toLowerCase();

    await delay(faker.number.int({ min: 280, max: 780 }));

    if (
      normalizedQuery.includes("error") ||
      normalizedQuery.includes("network")
    ) {
      return HttpResponse.json(
        {
          message: "Network request failed. Please retry the search.",
        },
        { status: 503 },
      );
    }

    const words = normalizedQuery.split(/\s+/).filter(Boolean);
    const rankedItems = searchItems
      .map((item) => ({
        item,
        score: words.length === 0 ? 1 : rankItem(item, words),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .map(({ item }) => item);

    const response: SearchResponse = {
      items: rankedItems.slice(0, 8),
      total: rankedItems.length,
      query,
    };

    return HttpResponse.json(response);
  }),
];

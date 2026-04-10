const STOP_TOKENS = new Set([
  "jobs",
  "job",
  "careers",
  "career",
  "apply",
  "view",
  "details",
  "openings",
  "positions",
  "senior",
  "junior",
  "remote",
  "india",
  "usa",
]);

function normalizeToken(token: string) {
  return token.trim().replace(/[^a-zA-Z0-9+#.]/g, "").toLowerCase();
}

function titleize(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function extractTagsFromJobUrl(jobUrl: string, max = 6) {
  try {
    const parsed = new URL(jobUrl);
    const tokens = `${parsed.pathname} ${parsed.search}`
      .split(/[\/?&=_.-]+/)
      .map(normalizeToken)
      .filter((token) => token.length > 2 && !STOP_TOKENS.has(token) && !/^\d+$/.test(token));

    const unique = Array.from(new Set(tokens)).slice(0, max);
    return unique.map((token) => titleize(token));
  } catch {
    return [];
  }
}

export function inferJdTitleFromJobUrl(jobUrl: string) {
  try {
    const parsed = new URL(jobUrl);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const candidate = pathSegments[pathSegments.length - 1] || pathSegments[pathSegments.length - 2] || "";
    const cleaned = candidate
      .replace(/\d+/g, "")
      .replace(/[^a-zA-Z0-9-_]/g, " ")
      .trim();

    if (!cleaned) {
      return "Job Description";
    }
    return titleize(cleaned);
  } catch {
    return "Job Description";
  }
}

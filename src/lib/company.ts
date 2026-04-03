const BOARD_HOST_KEYWORDS = [
  "linkedin",
  "naukri",
  "indeed",
  "wellfound",
  "monster",
  "glassdoor",
  "foundit",
] as const;

const STOP_WORDS = new Set([
  "jobs",
  "job",
  "careers",
  "career",
  "view",
  "search",
  "listing",
  "listings",
  "recommended",
  "currentjobid",
  "collections",
  "details",
  "apply",
  "at",
  "for",
  "the",
  "and",
  "in",
  "to",
  "openings",
  "positions",
]);

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function cleanToken(token: string) {
  return token
    .replace(/[^a-zA-Z0-9]/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeCompanyToken(value: string) {
  return titleCase(value.replace(/[-_]+/g, " "));
}

function fromKnownCareerHost(host: string, pathname: string) {
  const normalizedHost = host.replace(/^www\./i, "").toLowerCase();

  if (normalizedHost.includes("greenhouse.io")) {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first) {
      return normalizeCompanyToken(first);
    }
  }

  if (normalizedHost.includes("jobs.lever.co")) {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first) {
      return normalizeCompanyToken(first);
    }
  }

  if (normalizedHost.includes("workable.com")) {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first) {
      return normalizeCompanyToken(first);
    }
  }

  if (normalizedHost.includes("ashbyhq.com")) {
    const first = pathname.split("/").filter(Boolean)[0];
    if (first) {
      return normalizeCompanyToken(first);
    }
  }

  return null;
}

export function getCompanyNameFromJobUrl(jobUrl: string | null | undefined) {
  if (!jobUrl) {
    return "Company Not Detected";
  }

  try {
    const parsed = new URL(jobUrl.trim());
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const primaryHost = host.split(".")[0] || "";
    const isBoardUrl = BOARD_HOST_KEYWORDS.some((keyword) => host.includes(keyword));

    const fromCareerHost = fromKnownCareerHost(host, parsed.pathname);
    if (fromCareerHost) {
      return fromCareerHost;
    }

    // LinkedIn often contains `-at-company-name-<id>` in slug.
    const linkedInMatch = parsed.pathname.match(/-at-([a-z0-9-]+)-\d+/i);
    if (linkedInMatch?.[1]) {
      return normalizeCompanyToken(linkedInMatch[1]);
    }

    if (!isBoardUrl && primaryHost && primaryHost.length > 2) {
      return normalizeCompanyToken(primaryHost);
    }

    const segments = `${parsed.pathname} ${parsed.search}`
      .split(/[\/?&=_-]+/)
      .map(cleanToken)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));

    if (segments.length > 0) {
      return titleCase(segments.slice(0, 2).join(" "));
    }

    return isBoardUrl ? "Company Not Detected" : normalizeCompanyToken(primaryHost || "company");
  } catch {
    return "Company Not Detected";
  }
}

export function getDisplayCompanyName(companyName: string | null | undefined, jobUrl: string | null | undefined) {
  const normalized = companyName?.trim();
  if (normalized) {
    return normalized;
  }
  return getCompanyNameFromJobUrl(jobUrl);
}

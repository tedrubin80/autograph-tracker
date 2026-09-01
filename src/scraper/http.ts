const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ??
  "AutographTrackerBot/0.1 (+https://github.com/tedrubin80/autograph-tracker; polite, low-frequency, public catalog endpoints only)";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`HTTP ${status} fetching ${url}`);
  }
}

/** Fetch with a polite, identifying User-Agent and a hard timeout. */
export async function politeFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json, text/html;q=0.9",
        ...init?.headers,
      },
    });
    if (!res.ok) throw new HttpError(res.status, url);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

export async function politeFetchJson<T>(url: string): Promise<T> {
  const res = await politeFetch(url);
  return (await res.json()) as T;
}

/** Small delay between requests so a multi-page scrape doesn't hammer a shop. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

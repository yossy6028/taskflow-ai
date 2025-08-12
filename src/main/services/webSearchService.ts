import { config } from 'dotenv';

config();

export interface WebFinding {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
}

interface SerpOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
}

interface SerpApiResponse {
  organic_results?: SerpOrganicResult[];
}

class WebSearchService {
  private serpApiKey: string | undefined;

  constructor() {
    this.serpApiKey = process.env.SERPAPI_KEY;
  }

  /**
   * Perform a brief web search via SerpAPI (if configured). Returns up to 5 concise results.
   * Non-blocking: if key missing or call fails, resolves to an empty array.
   */
  async searchBrief(query: string): Promise<WebFinding[]> {
    if (!this.serpApiKey) {
      return [];
    }

    // Node fetch fallback (Node 18+)
    const f = (globalThis as any).fetch as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    if (typeof f !== 'function') {
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const params = new URLSearchParams({
        engine: 'google',
        q: query,
        api_key: this.serpApiKey,
        hl: 'ja',
        num: '5',
      });
      const resp = await f(`https://serpapi.com/search.json?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!resp.ok) {
        return [];
      }
      const data = (await resp.json()) as unknown as SerpApiResponse;
      const results: WebFinding[] = (data.organic_results || []).slice(0, 5).map((r) => ({
        title: String(r.title || ''),
        url: String(r.link || ''),
        snippet: r.snippet ? String(r.snippet) : undefined,
        date: r.date ? String(r.date) : undefined,
      }));
      return results;
    } catch (e) {
      void e;
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}

export default WebSearchService;



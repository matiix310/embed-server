import type { EmbedConfig } from "../embeds.config";

interface CacheEntry {
  data: unknown;
  fetchedAt: Date;
  error: string | null;
}

const store = new Map<string, CacheEntry>();
const timers = new Map<string, Timer>();

async function fetchEmbed(embed: EmbedConfig) {
  try {
    const res = await fetch(embed.apiUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    store.set(embed.id, { data, fetchedAt: new Date(), error: null });
    console.log(`[cache] refreshed "${embed.id}"`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[cache] failed to refresh "${embed.id}": ${msg}`);
    // Keep stale data if available, just record the error
    const existing = store.get(embed.id);
    store.set(embed.id, {
      data: existing?.data ?? null,
      fetchedAt: existing?.fetchedAt ?? new Date(),
      error: msg,
    });
  }
}

export function startCache(embeds: EmbedConfig[]) {
  for (const embed of embeds) {
    const interval = embed.refreshInterval ?? 5 * 60 * 1000;

    // Initial fetch
    fetchEmbed(embed);

    // Schedule recurring refresh
    const timer = setInterval(() => fetchEmbed(embed), interval);
    timers.set(embed.id, timer);
  }
}

export function getCache(id: string): CacheEntry | undefined {
  return store.get(id);
}

export function getAllCacheStatus(embeds: EmbedConfig[]) {
  return embeds.map((e) => {
    const entry = store.get(e.id);
    return {
      id: e.id,
      name: e.name,
      fetchedAt: entry?.fetchedAt?.toISOString() ?? null,
      error: entry?.error ?? null,
      hasData: entry?.data != null,
    };
  });
}

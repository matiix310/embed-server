import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { embeds } from "../embeds.config";
import { startCache, getCache, getAllCacheStatus } from "./cache";
import { renderShell, renderAdmin } from "./renderer";

// ---------------------------------------------------------------------------
// Boot cache
// ---------------------------------------------------------------------------
startCache(embeds);

const embedMap = new Map(embeds.map((e) => [e.id, e]));

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = new Hono();

app.use("*", logger());
app.use(
  "/embed/*",
  cors({ origin: "*" }), // Allow iframing from any domain
);

// Admin panel
app.get("/", (c) => {
  return c.html(renderAdmin(getAllCacheStatus(embeds)));
});

// Embed HTML page
app.get("/embed/:id", (c) => {
  const id = c.req.param("id");
  const embed = embedMap.get(id);
  if (!embed) return c.text("Embed not found", 404);

  const cached = getCache(id);
  let content = `<p class="empty">Loading data…</p>`;

  if (cached?.data) {
    try {
      content = embed.renderer(cached.data);
    } catch (err) {
      content = `<p class="empty">Render error: ${err instanceof Error ? err.message : err}</p>`;
    }
  }

  return c.html(
    renderShell(embed, content, cached?.error ?? null, cached?.fetchedAt ?? null),
  );
});

// Raw JSON data (useful for debugging or building your own frontend)
app.get("/api/:id", (c) => {
  const id = c.req.param("id");
  if (!embedMap.has(id)) return c.json({ error: "Not found" }, 404);

  const cached = getCache(id);
  if (!cached) return c.json({ error: "Cache not ready yet" }, 503);

  return c.json({
    id,
    fetchedAt: cached.fetchedAt,
    error: cached.error,
    data: cached.data,
  });
});

// Health check for Kubernetes liveness/readiness probes
app.get("/healthz", (c) => c.json({ ok: true }));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const port = Number(Bun.env.PORT ?? 3000);
console.log(`🚀 Embed server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

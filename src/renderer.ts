import type { EmbedConfig } from "../embeds.config";

export function renderShell(
  embed: EmbedConfig,
  content: string,
  error: string | null,
  fetchedAt: Date | null,
) {
  const ts = fetchedAt ? fetchedAt.toLocaleTimeString("fr-FR") : "—";

  return /* html */ `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${embed.name}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      /* Matches the dashboard's Mantine dark theme */
      --bg:          #2e2e2e;
      --border:      #373A40;
      --text:        #C1C2C5;
      --text-bright: #E9ECEF;
      --muted:       #5C5F66;
      --hover:       #343638;
      --divider:     #373A40;
      --accent:      #A6A7AB;
      --danger:      #f87171;
      --chip-bg:     #373A40;
      --chip-border: #4a4d54;
    }

    html, body {
      background: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }

    .shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    /* Label row — matches "HACKERNEWS" style in the dashboard */
    .label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
    }
    .label-text {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: .10em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .label-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: var(--muted);
    }
    .dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: ${error ? "var(--danger)" : "#4ade80"};
      animation: pulse 2.5s ease infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: .25; }
    }

    /* Error */
    .error-banner {
      margin: 0 14px 8px;
      padding: 6px 10px;
      background: rgba(248,113,113,.12);
      border-radius: 6px;
      color: var(--danger);
      font-size: 11px;
    }

    /* Scrollable list */
    .list {
      flex: 1;
      overflow-y: auto;
      scrollbar-width: none;
    }
    .list::-webkit-scrollbar { display: none; }

    /* Each row — no background, just a divider */
    .row {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 9px 14px;
      border-bottom: 1px solid var(--divider);
      cursor: default;
      transition: background .12s;
    }
    .row:last-child { border-bottom: none; }
    .row:hover { background: var(--hover); }

    .row-top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }

    .row-title {
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .row-right {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
    }

    .row-time {
      font-size: 11px;
      color: var(--muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 4px;
    }

    .chips a {
      font-size: 10px;
      color: var(--accent);
      text-decoration: none;
      background: var(--chip-bg);
      border: 1px solid var(--chip-border);
      border-radius: 4px;
      padding: 1px 7px;
      transition: background .12s;
    }
    .chips a:hover { background: #4a4d54; }

    /* Urgency badge */
    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: .04em;
      padding: 1px 6px;
      border-radius: 4px;
      background: color-mix(in srgb, var(--badge-color) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--badge-color) 35%, transparent);
      color: var(--badge-color);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Past deadlines — dimmed */
    .row--past {
      opacity: .38;
    }
    .row--past .row-title {
      text-decoration: line-through;
    }

    .empty {
      padding: 32px 14px;
      text-align: center;
      color: var(--muted);
      font-size: 12px;
    }

    /* Timestamp footer */
    .footer {
      padding: 6px 14px;
      font-size: 10px;
      color: var(--muted);
      border-top: 1px solid var(--divider);
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="label">
      <span class="label-text">${embed.name}</span>
      <span class="label-status">
        <span class="dot"></span>
        ${error ? "Error" : ts}
      </span>
    </div>

    ${error ? `<div class="error-banner">⚠ ${error}</div>` : ""}

    <div class="list">
      ${content}
    </div>
  </div>

  <script>
    setTimeout(() => location.reload(), ${embed.refreshInterval ?? 300_000});
  </script>
</body>
</html>`;
}

export function renderAdmin(
  embedStatuses: ReturnType<typeof import("./cache").getAllCacheStatus>,
) {
  const rows = embedStatuses
    .map(
      (e) => `
      <tr>
        <td><code>${e.id}</code></td>
        <td>${e.name}</td>
        <td>${e.hasData ? (e.error ? "⚠ Stale" : "✅ OK") : "⏳ Loading"}</td>
        <td>${e.fetchedAt ?? "—"}</td>
        <td>
          <a href="/embed/${e.id}" target="_blank">View embed</a> ·
          <a href="/api/${e.id}" target="_blank">Raw JSON</a>
        </td>
      </tr>`,
    )
    .join("");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Embed Server — Admin</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono&family=Syne:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0c12; color: #d8ddf0; font-family: 'DM Mono', monospace; padding: 32px; }
    h1 { font-family: 'Syne', sans-serif; font-size: 20px; margin-bottom: 24px; letter-spacing: .05em; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; color: #525870; border-bottom: 1px solid #1e2235; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
    td { padding: 10px 12px; border-bottom: 1px solid #1e2235; }
    a { color: #6366f1; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { background: #1e2235; padding: 2px 6px; border-radius: 4px; }
    tr:hover td { background: #111420; }
  </style>
</head>
<body>
  <h1>⬡ Embed Server</h1>
  <table>
    <thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Last Fetch</th><th>Links</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

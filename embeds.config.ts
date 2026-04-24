export interface EmbedConfig {
  /** URL slug: accessible at /embed/:id */
  id: string;
  /** Display name shown in the admin panel */
  name: string;
  /** External API to fetch data from */
  apiUrl: string;
  /** How often to refresh the cache (ms). Default: 5 minutes */
  refreshInterval?: number;
  /**
   * Renders the fetched data into an HTML string.
   * Return the *body content* only — the shell (head, theme, refresh) is injected automatically.
   */
  renderer: (data: unknown) => string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * IANA timezone for deadline parsing.
 * Reads from the TZ environment variable so Docker/k8s can override it,
 * with Europe/Paris as the default.
 */
const TIMEZONE = process.env.TZ ?? "Europe/Paris";

/**
 * Parses "dd/MM/yyyy" + "20h00" into a UTC-correct Date for a given IANA timezone.
 *
 * Containers run in UTC by default. Using `new Date(year, month, day, h, m)`
 * would produce a time in the container's local timezone (UTC), which is wrong
 * when deadlines are expressed in e.g. Europe/Paris (UTC+1/+2).
 *
 * This function uses the Intl offset-trick: it treats the wall-clock time as if
 * it were UTC, reads back what the target timezone thinks that UTC moment is,
 * computes the delta, and applies it — giving the correct UTC timestamp.
 */
function parseDeadline(date: string, heure: string, tz = TIMEZONE): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  const [day, month, year] = date.split("/").map(Number);
  const [h, m] = heure
    .replace("h", ":")
    .split(":")
    .map((n) => parseInt(n) || 0);

  // Step 1: treat the local wall-clock time as if it were UTC
  const asUTC = new Date(
    `${year}-${pad(month ?? 0)}-${pad(day ?? 0)}T${pad(h ?? 0)}:${pad(m ?? 0)}:00Z`,
  );

  // Step 2: find out what the target timezone reads for that UTC moment
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(asUTC).map((p) => [p.type, p.value]),
  );
  const tzAsUTC = Date.UTC(
    +(parts.year ?? 0),
    +(parts.month ?? 1) - 1,
    +(parts.day ?? 0),
    +(parts.hour ?? 0) % 24,
    +(parts.minute ?? 0),
    +(parts.second ?? 0),
  );

  // Step 3: offset = difference between what we claimed (UTC) and what TZ sees
  return new Date(asUTC.getTime() + (asUTC.getTime() - tzAsUTC));
}

/**
 * Returns urgency tier based on hours remaining:
 * 0 = < 2h  (red)
 * 1 = < 10h (orange)
 * 2 = < 24h (yellow)
 * 3 = < 48h (blue)
 * 4 = later (default muted)
 */
const URGENCY = [
  { hours: 2, color: "#ef4444", label: "< 2h" },
  { hours: 10, color: "#f97316", label: "< 10h" },
  { hours: 24, color: "#eab308", label: "< 24h" },
  { hours: 48, color: "#3b82f6", label: "< 48h" },
] as const;

function getUrgency(deadline: Date): { color: string; label: string } | null {
  const hoursLeft = (deadline.getTime() - Date.now()) / 36e5;
  if (hoursLeft < 0) return null; // past
  return URGENCY.find((u) => hoursLeft < u.hours) ?? null;
}

function row(
  title: string,
  time: string,
  links: { nom: string; url: string }[],
  urgency: { color: string; label: string } | null,
  isPast: boolean,
) {
  const chipHtml = links.length
    ? `<div class="chips">${links
        .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.nom}</a>`)
        .join("")}</div>`
    : "";

  const urgencyBadge = urgency
    ? `<span class="badge" style="--badge-color:${urgency.color}">${urgency.label}</span>`
    : "";

  return `
    <div class="row${isPast ? " row--past" : ""}">
      <div class="row-top">
        <span class="row-title">${title}</span>
        <span class="row-right">
          ${urgencyBadge}
          <span class="row-time">${time}</span>
        </span>
      </div>
      ${chipHtml}
    </div>`;
}

// ---------------------------------------------------------------------------
// Embeds — add yours here
// ---------------------------------------------------------------------------

export const embeds: EmbedConfig[] = [
  {
    id: "emapse",
    name: "SRS Deadlines",
    apiUrl: "https://srs.emapse.com/api/taches",
    refreshInterval: 5 * 60 * 1000, // 5 min

    renderer(data) {
      const items = data as Array<{
        id: string;
        date: string;
        heure: string;
        nom: string;
        liens: { nom: string; url: string }[];
      }>;

      if (!items.length) return `<p class="empty">No upcoming deadlines 🎉</p>`;

      // Attach parsed date, sort soonest first
      const sorted = items
        .map((item) => ({ ...item, _deadline: parseDeadline(item.date, item.heure) }))
        .sort((a, b) => a._deadline.getTime() - b._deadline.getTime());

      const now = Date.now();

      return sorted
        .map((item) => {
          const isPast = item._deadline.getTime() < now;
          const urgency = getUrgency(item._deadline);
          return row(
            item.nom,
            `${item.date} · ${item.heure}`,
            item.liens,
            urgency,
            isPast,
          );
        })
        .join("");
    },
  },

  // -------------------------------------------------------------------------
  // Example: a second embed with a different style
  // -------------------------------------------------------------------------
  // {
  //   id: "status",
  //   name: "Service Status",
  //   apiUrl: "https://yourapi.example.com/status",
  //   refreshInterval: 60_000,
  //
  //   renderer(data) {
  //     const services = data as Array<{ name: string; status: "up" | "down" | "degraded" }>;
  //     return services.map(s => {
  //       const color = s.status === "up" ? "#22c55e" : s.status === "degraded" ? "#f59e0b" : "#ef4444";
  //       return card(s.name, badge(s.status, color), [], color);
  //     }).join("");
  //   },
  // },
];

# embed-server

A lightweight self-hosted embed server built with **Bun + Hono**.  
Add an entry to `embeds.config.ts` → get a live, iframeable widget at `/embed/:id`.

## Routes

| Route | Description |
|-------|-------------|
| `GET /` | Admin panel — lists all embeds and their cache status |
| `GET /embed/:id` | The embeddable HTML page (auto-refreshes) |
| `GET /api/:id` | Raw cached JSON from the external API |
| `GET /healthz` | Kubernetes liveness/readiness probe |

## Adding a new embed

Open `embeds.config.ts` and add an entry to the `embeds` array:

```ts
{
  id: "my-widget",           // /embed/my-widget
  name: "My Widget",
  apiUrl: "https://api.example.com/data",
  refreshInterval: 2 * 60 * 1000,  // 2 min (optional, default 5 min)

  renderer(data) {
    const items = data as MyType[];
    return items.map(i => `<div class="card">...</div>`).join("");
  },
}
```

## Development

```bash
bun install
bun dev          # hot-reload on http://localhost:3000
```

## Docker

```bash
docker compose up --build
```

## Kubernetes

1. Build and push your image:
   ```bash
   docker build -t ghcr.io/YOUR_USER/embed-server:latest .
   docker push ghcr.io/YOUR_USER/embed-server:latest
   ```

2. Edit `k8s.yaml` — replace `YOUR_USER` and `yourdomain.com`.

3. Apply:
   ```bash
   kubectl apply -f k8s.yaml
   ```

## Embedding

```html
<iframe
  src="https://embeds.yourdomain.com/embed/deadlines"
  width="400"
  height="500"
  frameborder="0"
  style="border-radius: 10px; overflow: hidden;"
></iframe>
```

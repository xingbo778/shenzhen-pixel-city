# Shenzhen Pixel City

Interactive 3D simulation visualizer for an AI-driven city. Built with React 19, Three.js, and Vite.

The frontend connects to an external **World Engine** (Python) that simulates autonomous agents (bots) with emotions, skills, desires, and life narratives across 7 Shenzhen locations.

## Quick Start

```bash
pnpm install
pnpm dev
# Open http://localhost:3000
```

Without a World Engine running, the app starts in **mock mode** with sample data and demo NPCs.

## Architecture

```
client/src/
  engine/           # Game logic (pathfinding, entities, vehicles, sprites)
    three/          # Three.js 3D renderers (buildings, characters, vehicles)
    world/          # Chunk system, coordinate transforms
  components/       # React UI components
  hooks/            # useWorldData, useGameLoop, useMapDrag
  pages/            # Route pages (Home)
  types/            # TypeScript type definitions
  lib/              # Utilities, mock data, validation
server/             # Express static file server
shared/             # Shared constants
```

### Rendering Pipeline

- **2D mode** (`PixelCityMap`): Canvas-based tile rendering with pixel sprites
- **3D mode** (`PixelCityMap3D`): Three.js with orthographic camera, LOD buildings, sprite billboards
- **Chunk system**: Spatial indexing for entity/vehicle management on large maps

### Game Engine

- **A\* Pathfinding** with binary heap, path caching, and chunk-aware hierarchical routing
- **Entity System**: Tile-based movement with sub-tile interpolation, 8-way facing
- **Vehicle System**: Lane-based ambient traffic and boats with sprite animation
- **Sprite System**: 16x24 pixel characters with occupation-specific palettes

## World Engine Integration

The frontend polls an external World Engine via HTTP:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `{ENGINE_URL}/world` | GET | Full world state (bots, locations, events, weather) |
| `{ENGINE_URL}/moments` | GET | Social feed / moment posts |
| `{ENGINE_URL}/bot/{id}/detail` | GET | Detailed bot info |
| `{ENGINE_URL}/admin/send_message` | POST | Send message to a bot |

### WorldState JSON Schema

```typescript
interface WorldState {
  time: { tick: number; virtual_hour: number; virtual_day: number; virtual_datetime: string }
  weather: { current: string; desc: string; changed_at_tick: number }
  news_feed: { headline: string; source: string; tick: number; time: string }[]
  hot_topics: string[]
  bots: Record<string, BotState>
  locations: Record<string, LocationState>
  events: { tick: number; time: string; event: string; desc: string }[]
  world_narrative: string
  world_modifications: WorldModification[]
  generation_count: number
  graveyard: BotState[]
}

interface BotState {
  id: string
  name: string
  age: number
  gender: string
  origin: string
  location: string
  hp: number           // 0-100
  money: number
  energy: number       // 0-100
  status: 'alive' | 'dead'
  occupation?: string
  current_activity: string
  emotions: { happiness: number; sadness: number; anger: number; anxiety: number; loneliness: number }
  skills: { tech: number; social: number; creative: number; physical: number }
  desires: { lust: number; power: number; greed: number; vanity: number; security: number }
  action_log: { tick: number; time: string; plan: string; action?: object; result?: object }[]
  // ... additional fields (see client/src/types/world.ts)
}
```

### Data Source Modes

- **auto**: Try real engine first, fall back to mock data on failure
- **real**: Only use real engine (shows error if unreachable)
- **mock**: Use built-in mock data (no network requests)

## Agent / Skill Integration

To connect an AI agent to this visualizer:

1. **Implement the World Engine API** — your agent system must expose the endpoints above returning the `WorldState` JSON schema
2. **Set the engine URL** — via environment variable or the UI input field:
   ```bash
   VITE_ENGINE_URL=http://your-engine:8000 pnpm dev
   ```
3. **Bot interaction** — send messages to bots via `POST /admin/send_message`:
   ```json
   { "from": "user", "to": "bot_1", "message": "Hello!" }
   ```
4. **Real-time updates** — the frontend polls `/world` every 3 seconds. Bot position, activity, and emotion changes are reflected automatically.

### Supported Locations

| Key | Label | Type |
|-----|-------|------|
| `南山科技园` | Nanshan Tech Park | Business |
| `宝安城中村` | Baoan Urban Village | Residential |
| `华强北` | Huaqiangbei Electronics | Commercial |
| `福田CBD` | Futian CBD | Business |
| `东门老街` | Dongmen Old Street | Commercial |
| `南山公寓` | Nanshan Apartments | Residential |
| `深圳湾公园` | Shenzhen Bay Park | Leisure |

## Development

```bash
pnpm dev              # Dev server (port 3000)
pnpm check            # TypeScript type check
pnpm lint             # ESLint
pnpm test             # Unit tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright, headless)
pnpm test:e2e:headed  # E2E tests (visible browser)
pnpm build            # Production build
pnpm preview          # Preview production build
```

### Project Structure

| Directory | Purpose |
|-----------|---------|
| `client/src/engine/` | Core simulation engine (pathfinding, entities, vehicles) |
| `client/src/engine/three/` | Three.js 3D rendering layer |
| `client/src/components/` | React components (map, panels, UI) |
| `client/src/hooks/` | Custom hooks (world data, game loop, map interaction) |
| `client/src/lib/` | Utilities, mock data, validation schemas |
| `client/src/types/` | TypeScript type definitions |
| `server/` | Express static file server |
| `e2e/` | Playwright E2E tests |

## Deployment

### Docker

```bash
docker build -t shenzhen-pixel-city .
docker run -p 8080:8080 shenzhen-pixel-city
```

The Docker image uses a multi-stage build:
1. **Build stage**: Node 22 + pnpm, runs `vite build` + `esbuild`
2. **Runtime stage**: Nginx Alpine, serves static assets

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port (Docker/nginx) |
| `VITE_ENGINE_URL` | `http://localhost:8000` | World Engine API base URL |
| `NODE_ENV` | — | Set to `production` for Express server |

### Express Server (Alternative)

```bash
pnpm build
pnpm start   # Runs Express on port 3000
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Radix UI
- **3D Rendering**: Three.js 0.183, CSS2DRenderer
- **Routing**: Wouter
- **Animation**: Framer Motion
- **Build**: Vite 7, esbuild
- **Testing**: Vitest, Playwright
- **Deployment**: Docker (Nginx), Express

## License

Private

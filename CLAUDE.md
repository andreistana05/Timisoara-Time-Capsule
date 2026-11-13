# CLAUDE.md — TIMIȘOARA TIME CAPSULE (Holographic Living Museum)

> Read this whole file before touching code. Four people are running Claude Code **in parallel on this one repo**.
> The folder-ownership rules in §2 are what keep us at **zero merge conflicts**. They override any instinct to "just fix it" in someone else's folder.

---

## 1. Product vision

**Track:** MuseumsQuartier — *"Use Timișoara's heritage and public spaces to design interactive setups blending sound, visuals and physical elements."*

**Concept:** A portable, multi-device **"Museum-in-a-Box"**. Three physical screens sync in real time over WebSockets and together become a small living museum on the jury's table. It needs no GPS and no venue, and works fully on a tabletop.

It addresses three local challenges:

| Code  | Challenge | Our answer |
|-------|-----------|------------|
| IA-16 | Timișoara has **no physical Museum of the December 1989 Revolution** worthy of the city where it started | Chapters 1 & 2 are a portable, holographic museum of Dec 16–20, 1989 |
| IA-07 | **Mute public monuments**: squares and buildings that don't tell their story | Piața Maria and the Opera balcony "speak" through AR and voice testimony |
| IA-17 | Showcasing **Timișoara's 21 ethnic communities** | Chapter 3, the Mosaic: Romanian, Hungarian, German/Swabian, Serbian, Jewish and Bulgarian stories, in 5 languages |

### Storytelling context (keep it accurate)
- **16 Dec 1989, Piața Maria.** Parishioners of every faith form a human chain around the parish house of Reformed pastor **László Tőkés** (Tőkés László) to stop his eviction. Trams stop in Piața Maria, passengers join the crowd, and by evening the protest turns into open anti-communist chanting. This is the spark of the Romanian Revolution.
- **20 Dec 1989, Opera Square (today Piața Victoriei).** Factories strike and workers march downtown. More than 100,000 people fill the square. The Romanian Democratic Front (Frontul Democratic Român) speaks from the **Opera balcony**, and Timișoara is declared **the first city in Romania free of communism**.
- **The Mosaic.** For three centuries Fabric, Iosefin, Elisabetin and Cetate have mixed synagogues with Orthodox, Catholic and Reformed churches, Secession (Art Nouveau) façades, multilingual markets and wedding music. Timișoara was also European Capital of Culture in 2023.
- **Seed testimonies are COMPOSITES.** Names are fictional. Places, dates and events are historical. Every seed has `composite: true` and the UI labels it "Composite testimony". **Never present invented quotes as real eyewitness accounts.** A juror from Timișoara will notice.

### The 3 screens ("phygital" setup)

```
          ┌────────────────────────┐   WebSocket   ┌──────────────────────┐
          │  PHONE  /ar            │◄─────────────►│                      │
          │  Holographic WebAR Lens│               │  SERVER :3001        │
          │  (pointed at tablet)   │               │  Express + Socket.io │
          └───────────▲────────────┘               │  in-memory           │
                      │ camera looks at            │  globalState         │
          ┌───────────┴────────────┐               │                      │
          │  TABLET  /tablet       │◄─────────────►│                      │
          │  The Physical Pedestal │               └──────────▲───────────┘
          │  (lies flat, the Seal) │                          │
          └────────────────────────┘               ┌──────────┴───────────┐
                                                   │  LAPTOP  /stage      │
                                                   │  Urban Projection &  │
                                                   │  Living Archive      │
                                                   └──────────────────────┘
```

1. **TABLET `/tablet`: The Physical Pedestal.** Lies flat on the table. At its centre is **"The Seal"**, a high-contrast Secession-style geometric marker that the phone camera points at. Around it are a **chapter selector** (3 chapters), a **language selector** (`ro en hu de sr`, switches every device), and the **"Ignite a Memory Spark"** drawer: name + typed or **voice-dictated** (Web Speech API) memory + symbol (`candle | flower | musical_note`) → `ADD_MEMORY`.
2. **PHONE `/ar`: The Holographic WebAR Lens.** The live rear camera (`getUserMedia`) sits under an alpha-transparent R3F `<Canvas>`, with a toggle to 3D Orbit mode. It shows a chapter diorama (tram blockade + embers / Opera monolith + light beams / kinetic Secession rings) and **Memory Orbs** for the active chapter's memories. Tapping an orb opens a HUD card in the active language, **reads it aloud** (`speechSynthesis`) and emits `SELECT_MEMORY_NODE`. New memories **rise out of the tablet** on a light pillar.
3. **LAPTOP `/stage`: Urban Projection & Living Archive.** Full-screen dark projection facing the room. It shows the chapter title and narrative, a **generative WebAudio drone + canvas soundwave visualizer**, a **Spotlight panel** (whatever orb was tapped on the phone), a **living archive strip**, and a **full-screen particle celebration + chime** on every `MEMORY_ADDED`.

**Demo script (≈90 s):** open `/stage` on the projector → tablet on the table → juror holds the phone over the Seal → tablet switches to "Opera Balcony" (everything changes) → juror taps an orb (phone speaks, stage spotlights it) → switch language to HU/DE (everything re-renders) → juror types or dictates a family memory on the tablet → orb rises on the phone + celebration on the stage.

---

## 2. STRICT FOLDER OWNERSHIP (Zero Merge Conflicts Policy)

| Member | Role | May edit **ONLY** |
|---|---|---|
| **Member 1** | Backend, State & AI | `server/**`, `shared/**` |
| **Member 2** | Tablet Pedestal UI | `client/src/views/tablet/**`, `client/public/assets/tablet/**` |
| **Member 3** | Mobile WebAR & 3D Scene | `client/src/views/ar/**`, `client/public/assets/ar/**` |
| **Member 4** | Laptop Stage & Audio | `client/src/views/stage/**`, `client/public/assets/stage/**` |

### 🔒 FROZEN shared files (no edits without the whole team agreeing in chat)
- `shared/events.js` (socket contract), `shared/i18n.js` (Member 1 is the gatekeeper)
- `client/src/App.jsx`, `client/src/main.jsx`, `client/src/index.css` (design tokens)
- `client/src/socket/useSocket.js`
- `client/src/components/**` (Launchpad, `SymbolIcon`, `ConnectionBadge`, `SYMBOL_META`)
- **every** `package.json` / `package-lock.json`, `client/vite.config.js`, `client/index.html`, `.gitignore`, `CLAUDE.md`

### Rules for every agent (Claude, this means you)
1. **Before editing any file, check its path against the table above.** If it is outside your member's folders, **stop and ask the human.** Do not edit it "just a little".
2. **Need something from a frozen file?** Read it and use it. Don't change it. If you need a *variant* of a shared component, **copy it into your own view folder** and change the copy.
3. **No new npm packages.** Every dependency we expect to need is already installed: `react 19`, `react-router-dom 7`, `socket.io-client 4`, `three 0.180`, `@react-three/fiber 9`, `@react-three/drei 10`, `framer-motion 12`, `lucide-react`, `howler`, `tailwindcss 4`. If you truly need another one, tell the human. Member 1 adds it in a single coordinated commit, and everyone else pulls.
4. **View-specific strings** (labels only your screen uses) live in your own view folder as `{ ro, en, hu, de, sr }` objects. Only strings shared across screens go in `shared/i18n.js`.
5. **Static assets** (GLB models, audio, images) go in `client/public/assets/<your-view>/` and load via `/assets/<your-view>/file.ext`.
6. **Need a contract change** (new event, new state field)? Member 1 implements it in `shared/` + `server/` **additively**: new optional fields and new events only, never renames or removals. Then announce it.
7. Never run formatters or codemods across the whole repo (`prettier --write .`, `eslint --fix .`). Format only your own folder.

### Git workflow
```bash
git checkout -b m2/tablet-drawer          # prefix with m1/ m2/ m3/ m4/
git pull --rebase origin main             # often
git diff --name-only origin/main...       # before every commit/PR: every path must be in YOUR folders
git commit -m "tablet: …"                 # prefix = server|shared|tablet|ar|stage
```
If `git diff --name-only` shows a file outside your folders, revert it (`git checkout origin/main -- <file>`) before pushing.

---

## 3. Socket.io contract

Source of truth: **`shared/events.js`**. Import constants and never hard-code event strings:
```js
import { EVENTS, CHAPTERS, CHAPTER_IDS, LANGUAGES, SYMBOLS, tr } from '@shared/events.js'; // client
import { EVENTS } from '../shared/events.js';                                               // server
```

### Events

| Event | Direction | Payload | Server behaviour |
|---|---|---|---|
| `STATE_INIT` | server → connecting client | `globalState` | sent once on connect |
| `STATE_UPDATED` | server → **all** | `globalState` (full snapshot) | after every mutation |
| `CHANGE_CHAPTER` | client → server | `{ chapterId }` | validates, sets `activeChapter`, **resets `activeNodeId` to `null`**, broadcasts |
| `CHANGE_LANGUAGE` | client → server | `{ language }` | validates (`ro en hu de sr`), broadcasts |
| `SELECT_MEMORY_NODE` | client → server | `{ id }` (`string` or `null` to clear) | validates the id exists, broadcasts |
| `ADD_MEMORY` | client → server | `{ name, text, symbol, language?, chapter?, title? }` | sanitises (name ≤ 40, text ≤ 600), builds a Memory, emits `MEMORY_ADDED`, then `STATE_UPDATED` |
| `MEMORY_ADDED` | server → **all** | `{ memory }` | one-shot trigger for celebrations and rising orbs |

Every client → server event accepts an **ack callback** → `{ ok: true, ... }` or `{ ok: false, error }`. `ADD_MEMORY`'s ack includes `{ memory }`.

### `globalState`
```ts
{
  activeChapter: '1989_piata_maria' | '1989_opera' | 'multicultural_mosaic',  // default '1989_piata_maria'
  language: 'ro' | 'en' | 'hu' | 'de' | 'sr',                                  // default 'ro'
  activeNodeId: string | null,      // memory currently spotlighted
  memories: Memory[]                // 9 seeds + live visitor memories (cap 200; seeds are never trimmed)
}
```

### `Memory`
```ts
{
  id: string,                        // 'seed-…' or 'mem-xxxxxxxx'
  chapter: ChapterId,
  author: string,
  role: { ro, en, hu, de, sr } | null,     // seeds only
  year: number,
  symbol: 'candle' | 'flower' | 'musical_note',
  position: { x, y, z },             // orbit slot around the diorama (radius ≈ 1.4–2.1, y ≈ 0.1–1.1)
  title: { [lang]: string },         // seeds: all 5 languages; visitor memories: only originalLanguage
  text:  { [lang]: string },
  originalLanguage: Lang,
  composite: boolean,                // true = illustrative seed testimony
  isSeed: boolean,
  createdAt: ISOString
}
```
**Always render translated fields with `tr(obj, lang, memory.originalLanguage)`.** Visitor memories exist only in the language they were written in.

### Client hook (`client/src/socket/useSocket.js`)
```js
const { state, connected, changeChapter, changeLanguage, selectMemoryNode, addMemory, lastAddedMemory } = useSocket();
// state: globalState | null (null until STATE_INIT arrives)
// lastAddedMemory: { memory, receivedAt } | null — a new object per MEMORY_ADDED; use it as an effect dependency
// actions return Promise<ack>; chapter/language/select update local state optimistically
```
- There is **one socket per browser tab** (a module singleton), so you can call `useSocket()` in as many components as you like.
- It connects to **`VITE_SOCKET_URL` or `window.location.origin`**. In dev, Vite proxies `/socket.io` and `/api` to `:3001`, so phones only need **one** HTTPS tunnel URL. (Connecting to `hostname:3001` directly would break over the tunnel and on HTTPS pages.)

### REST helpers (server)
- `GET /api/state` returns the current `globalState`
- `GET /api/health` returns `{ ok, clients }`
- `POST /api/reset` restores the seeds and chapter 1 (run before each jury demo: `npm run reset`)

---

## 4. Design system

Dark museum projection, in the spirit of Ars Electronica / MuseumsQuartier. Secession (Art Nouveau) geometry meets holographic glow.

| Token (Tailwind / CSS var) | Hex | Use |
|---|---|---|
| `obsidian` / `--color-obsidian` | `#0a0a0f` | page background (always) |
| `obsidian-2`, `obsidian-3` | `#12121a`, `#1b1b26` | raised surfaces |
| `amber-gold` | `#f59e0b` | primary accent, candles, Opera chapter |
| `crimson` | `#ef4444` | revolution, Piața Maria chapter, errors |
| `cyan-holo` | `#38bdf8` | hologram, Mosaic chapter, musical notes |
| `ivory` | `#f5f0e6` | body text |
| `mist` | `#9ca3af` | secondary text |
| symbol colours | candle `#f59e0b`, flower `#f472b6`, note `#38bdf8` | `SYMBOL_META` in `components/common.jsx` |

- Each chapter has `CHAPTERS[id].theme = { primary, secondary, glow }`. **Drive accent colours from the active chapter** so all three screens change mood together.
- **Type:** `font-display` = Cormorant Garamond (titles, testimonies), `font-sans` = Space Grotesk (UI), `font-mono` = JetBrains Mono (labels: uppercase + wide tracking like `tracking-[0.3em]`). These load from Google Fonts and fall back to system fonts offline.
- **Utilities** (in `index.css`): `glass` (blurred translucent panel), `holo-text` (amber→cyan gradient text), `grain` (subtle dot texture).
- **Motion:** slow and ceremonial (0.6–1.5 s ease-out), with springs for things that "arrive". Nothing should bounce cheaply.
- Tablet is touch-first: hit targets ≥ 44 px. Phone: respect `env(safe-area-inset-*)`. Stage: readable from 4 m, so body text ≥ 24 px.

---

## 5. Running it

**Prereqs:** Node ≥ 20 (we use 22 LTS). No sudo? Unpack the official tarball into `~/.local/node` and add `~/.local/node/bin` to `PATH`.

```bash
npm run install:all     # root + server + client
npm run dev             # server :3001 + client :5173 together (or dev:server / dev:client separately)
```
Open `http://localhost:5173/` (Launchpad) → `/tablet`, `/ar`, `/stage`.

### Phones and tablets (camera needs HTTPS)
`getUserMedia` and speech recognition only work in a **secure context**. A plain `http://192.168.x.x:5173` works for `/tablet` and `/stage`, but the **camera on `/ar` will be blocked**. Use a tunnel:
```bash
npm run tunnel          # = npx cloudflared tunnel --url http://localhost:5173
```
Open the printed `https://….trycloudflare.com/ar` on the phone. Sockets go through the same URL via the Vite proxy (`allowedHosts: true` is already set).

### Single-port "production" mode
```bash
npm start               # builds client → server serves client/dist + sockets on :3001
npx cloudflared tunnel --url http://localhost:3001
```

### Debugging
- `curl localhost:3001/api/state | jq` shows live state; the server logs every connect, disconnect and new memory.
- In dev, `window.__timecapsuleSocket` in the browser console is the live socket.

---

## 6. Repo map

```
shared/            events.js (contract, CHAPTERS, LANGUAGES, tr())  ·  i18n.js (shared UI strings)   [M1, frozen]
server/            index.js (Express + Socket.io)  ·  seedData.js (9 composite testimonies × 5 langs)  [M1]
client/
  vite.config.js   @shared alias, 0.0.0.0:5173, proxy /socket.io + /api → :3001                [frozen]
  src/App.jsx      routes (views lazy-loaded; three.js ships only with /ar)                    [frozen]
  src/socket/      useSocket.js                                                                 [frozen]
  src/components/  Launchpad.jsx, common.jsx (SymbolIcon, ConnectionBadge, SYMBOL_META)          [frozen]
  src/views/tablet TabletView, Seal (SVG marker), MemoryDrawer (dictation + symbols)             [M2]
  src/views/ar     ArView, Dioramas (3 procedural scenes), MemoryOrbs, useCamera, speech          [M3]
  src/views/stage  StageView, SoundwaveVisualizer, useAmbientAudio (WebAudio), Celebration        [M4]
  public/assets/{tablet,ar,stage}/   per-owner static assets
```

---

## 7. Gotchas we already hit (read before debugging)

- **iOS speech:** call `speechSynthesis.speak()` *synchronously inside the tap handler* (see `ArView.handleSelect`). A `setTimeout` loses the user gesture and iOS stays silent.
- **Audio autoplay:** the stage drone starts only after a click ("enable generative sound"). Click it once before the jury arrives.
- **Background tabs freeze animations.** Browsers throttle `requestAnimationFrame` in hidden tabs, so framer-motion `AnimatePresence mode="wait"` exits never finish and the screen looks stale. Keep `/stage` as the visible, focused, full-screen tab.
- **React StrictMode** runs effects twice in dev. Effects must clean up (camera tracks, rAF, AudioContext).
- **Visitor memories exist in one language only**: always use `tr(..., memory.originalLanguage)` as the fallback.
- **`CHANGE_CHAPTER` clears `activeNodeId`**, so closing HUDs and spotlights on chapter change is expected.
- **State lives in memory**: restarting the server wipes visitor memories. This is fine for a demo. Member 1 can add JSON-file persistence.
- **Phone perf:** keep `dpr={[1, 2]}`, keep particle counts in the hundreds rather than thousands, and avoid real-time shadows.

---

## 8. V1 status & suggested next steps per owner

V1 runs end-to-end today: all 7 events are verified across 3 simulated clients through the Vite proxy, and all views render with zero console errors.

- **M1 (server/AI):** persist memories to `server/data/*.json`; auto-translate visitor memories into all 5 languages (e.g. an LLM call on `ADD_MEMORY`, then patch `title`/`text` and broadcast); add a profanity/length moderation pass; add an optional `role` query for presence counts per screen.
- **M2 (tablet):** a real image-tracking-friendly Seal export (PNG in `assets/tablet/`); an idle "attract mode"; haptic and visual confirmation when a spark is sent; an on-screen keyboard-friendly layout for flat use.
- **M3 (AR):** true marker tracking (e.g. MindAR / 8th Wall-style image target of the Seal) instead of a free-floating scene; GLB models of the tram and Opera; orb labels; a richer rising animation for `lastAddedMemory`.
- **M4 (stage):** Howler-based field recordings per chapter (`assets/stage/`) layered on the drone; memory constellation as an animated star map; "Composite testimony" label translated; a QR code that points visitors' own phones to `/ar`.

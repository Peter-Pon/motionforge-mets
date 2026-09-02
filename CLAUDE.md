# CLAUDE Development Guidelines

## 1. Development Workflow

### Large Module Development
For major features and modules, follow this structured approach:
- **Planning Phase**: Create detailed implementation plan and break down into tasks
- **Development Phase**: Implement the planned features systematically
- **Manual Testing Phase**: Wait for human verification before proceeding

### Small Bug Fixes and Minor Changes
- Can be implemented directly without formal planning
- Quick fixes and small improvements don't require the full workflow

## 2. Git Commit Guidelines

### Commit Messages
- Write clear, concise commit messages describing the changes
- DO NOT include any AI/Claude generation indicators
- Use conventional commit format when appropriate (feat:, fix:, docs:, etc.)

### Commit Authorization
- **NEVER** commit changes automatically
- **ALWAYS** wait for explicit human instruction before committing
- Present changes for review first, then wait for commit approval

## 3. Network Access with curl

### Internal Network Access
**IMPORTANT**: When accessing internal/local network resources:
```bash
curl --noproxy '*' [URL]
```
- The `--noproxy` flag bypasses global proxy settings
- This is critical for accessing localhost and internal network resources
- Always use this flag for internal API calls and local services

### Example Usage
```bash
# Accessing local development server
curl --noproxy '*' http://localhost:3000/api/data

# Accessing internal network resources
curl --noproxy '*' http://192.168.1.100:8080/status
```

## 4. Internationalization (i18n) Guidelines

### Development Standards
- **All UI text** must use i18n functions - never hardcode text
- **Default language**: Traditional Chinese (zh-TW)
- **Supported languages**: zh-TW, zh-CN, en, ja, ko
- **Translation keys**: Use semantic naming (e.g., `menu.file.import` not `btn_1`)
- **Dynamic content**: Support variable interpolation and pluralization

### File Structure
```
src/locales/
├── zh-TW/   # Traditional Chinese (default)
├── zh-CN/   # Simplified Chinese
├── en/      # English
├── ja/      # Japanese
└── ko/      # Korean
```

### Best Practices
- Extract all text during component development
- Provide context comments for translators
- Test all languages during development
- Handle missing translations gracefully with fallback

## 5. Branding (DYNMECH CycleView)

This project ships as **DYNMECH CycleView** — a free, no-licence-key tool in the
DYNMECH product family alongside DYNMECH Motion and SolidPilot AI. It was
originally published as METS (Mechanism Timing Simulation) by Motionforge; the
derivation is recorded in `NOTICE` and must stay there.

### Names
- Product: **DYNMECH CycleView** (short form **CycleView**; never "METS")
- Spelling: the company name is always upper-case **DYNMECH** in prose and UI,
  matching the wordmark in the VI lockup; never "DynMech". Lower-case stays in
  identifiers only (`com.dynmech.cycleview`, `dynmech-cycleview`, dynmech.com).
- Company in prose: **DYNMECH**. The splash card footer reads "Dynmech" because
  that is verbatim what the Motion splash artwork uses — leave it alone.
- Chinese product name: 节拍视图 / 節拍視圖; Japanese: タクトビュー; Korean keeps
  the Latin name "CycleView"
- appId `com.dynmech.cycleview`, npm name `dynmech-cycleview`

### Visual identity
Ink `#12161B`, paper `#FAF9F7`, drive blue `#1F5FE8`. **One blue accent per
surface** — on the splash that budget is spent on the playhead. Brand assets
live in `assets/brand/`; the mark is copied verbatim from the Dynmech VI and
must not be redrawn. `assets/splash.html` is the splash source (SVG, 1120x600
at 2x, shown in a 560x300 frameless window); the PNGs under
`assets/brand/splash/` are exports of it, re-render them if the card changes.

The splash wordmark is set in the Helvetica/Arial stack, **not** Archivo, even
though the VI lockups specify Archivo — because the shipped DYNMECH Motion
splash artwork is not Archivo either (measured: 465x62 ink at 1120x600, which
Arial Bold matches exactly and Archivo does not, at either weight). Matching the
sibling product beats matching the guide. Do not "fix" this to Archivo unless
Motion's card is re-rendered in the same pass; see
`assets/brand/fonts/README.md`, which ships the font ready for that day.

### Rendering and timing architecture
Three modules, and the invariant is that nothing duplicates them:
- `src/lib/timingModel.ts` — when each action starts and how long the cycle
  runs. The timeline (App.tsx), the canvas overlay and the MP4 exporter all
  read from here. This logic used to exist in two places and drifted.
- `src/lib/canvasRenderer.ts` — all drawing. `renderTimingFrame` is called by
  both the on-screen canvas and the video exporter, so the MP4 cannot look
  different from the app.
- `src/lib/drawSurface.ts` — the seam that lets one renderer paint to several
  outputs: `CanvasSurface` (screen + video) and `SvgSurface` (PDF).
- `src/services/videoExport.ts` — WebCodecs H.264 encode + mp4-muxer. Frames are
  re-rendered offscreen at exact ms offsets; this is **not** a screen capture,
  so output length is independent of machine speed and UI playback rate.
- `src/services/pdfExport.ts` — the report document. Two rules learned the hard
  way and easy to undo by accident:
  1. **No JS PDF library.** Module names here are routinely CJK; jsPDF and
     friends need megabytes of embedded font for that. The PDF comes from
     `webContents.printToPDF` (`pdf:export` in main), so Chromium uses system
     fonts and the output stays vector and searchable. jsPDF was removed.
  2. **The running header/footer are `position: fixed` in the document**, not
     printToPDF header/footer templates. Templates are rendered without the
     page CSS and get scaled to fit; anything using flex, tables or `mm` units
     collapses to an unreadable 0.75pt. Only the page number lives in a
     template, as a single right-aligned block div. Verified across a 5-page
     print.
  The report uses `computeContentSize`, not `computeCanvasSize` — the latter's
  800x600 floor is there to fill the app window and would leave a printed page
  two thirds empty.

### Compatibility invariants (do not "clean these up")
1. `usePreferencesStore` reads `cycleview-preferences`, falling back **read-only**
   to the legacy `mets-preferences` key.
2. Project files (`.cvp` / legacy `.mts`) are no longer opened or saved: the
   New / Open / Save / Save As commands were removed on 2026-09-02 at the
   owner's request. CSV import is the only way data enters the app.
3. `electron-builder.files` must keep `assets/**/*` — the splash and the runtime
   window icon are loaded from there at `join(__dirname, '../assets/...')`.

### Licensing
Source is Apache-2.0 (`LICENSE`, `NOTICE`); binaries ship under `EULA.md`. The
software is free, needs no key, and **makes no network requests** — the EULA
says so explicitly, so any feature that would phone home (telemetry, update
check, cloud export) requires the EULA and privacy wording to change first.

## Summary
1. Large features: Plan → Develop → Test (with human verification)
2. Small fixes: Direct implementation allowed
3. Git commits: No AI markers, require explicit permission
4. curl usage: Always use `--noproxy '*'` for internal network access
5. i18n: All UI text must be internationalized, default language is zh-TW
6. Branding: product is DYNMECH CycleView; keep the compat invariants in §5
## 6. Online edition (cycleview_online)

The web build is the same code with a build-time switch, not a fork:

- `npm run build:web` / `npm run dev:web` use `vite.web.config.ts` (no Electron
  plugin, output `dist-web/`) with `--mode online`, which loads `.env.online`
  and sets `VITE_CYCLEVIEW_ONLINE=1`.
- All gating reads `src/lib/platform.ts` (`IS_ONLINE`, `ONLINE_ROW_LIMIT`,
  `desktopDownloadUrl`, `ONLINE_DISABLED_COMMANDS`). Online-only UI lives in
  `src/components/OnlineExtras.tsx`; share links in `src/lib/shareLink.ts`.
- The online edition is deliberately a **subset** that steers people to the
  desktop download: read-only table, capped rows, exports replaced by a
  download prompt, no preferences/undo/redo. Do not add output-producing
  features to it. Its two extras are the sample gallery and share links (CSV
  compressed into the URL fragment, which never reaches the server).
- Deployment lives in the separate `cycleview_online` repository, which pulls
  this one in as the `app/` git submodule and builds a static nginx image.

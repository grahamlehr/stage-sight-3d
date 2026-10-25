# Handoff
_Updated 2026-10-25 · branch `claude/video-source-config-325519` · PR not opened yet_

## Goal
Multiple screens fed by one video source. Each screen either **repeats** the whole source or takes its **slice** of a source **split** across several screens (for example a 5760×1080 laptop output cut into left, centre and right walls). Screens can be bound to meshes picked in a custom GLB venue, including angled (splayed) side screens.

## Plan

### Step 1: store and pure maths (Sonnet subagent)
**Files:** `src/store/useStageStore.ts` (+ test), new `src/utils/screenLayout.ts` (+ test), new `src/utils/screenMeshMeasure.ts` (+ test).

Store model. Replace the single-screen fields (`screenMode`, `boundMeshName`, `screenWidth`, `screenHeight`, `screenPosition`, `screenRotation`) with:

```ts
export type ScreenRole = 'split' | 'repeat';
export interface StageScreen {
  id: string;
  name: string;
  width: number;            // metres
  height: number;           // metres
  position: [number, number, number];
  rotation: [number, number, number]; // only Y is used
  role: ScreenRole;
  boundMeshName: string | null;
}
screens: StageScreen[];            // never empty
primaryScreenId: string;           // telemetry, camera look target, stage props, VR use this one
selectedScreenId: string;          // the screen the size inputs, presets and gizmo edit
splitOrder: string[] | null;       // null = auto (left to right as the audience sees it, i.e. ascending X)
```

- Default: one screen `{ id: 'main', name: 'Main screen', 16 × 4.5, [0, 3.4, -12], rotation 0, role 'split', boundMeshName null }`.
- Export `selectPrimaryScreen(state)` and `selectSelectedScreen(state)`.
- Keep the existing setters' names but make them act on the **selected** screen: `setScreenDimensions`, `setScreenPreset`, `setScreenPosition`, `setScreenRotation`. Drop `setScreenMode` and `setBoundMeshName` (and the unused `ScreenMode` type).
- New actions: `addScreen(partial) → id`, `updateScreen(id, patch)`, `removeScreen(id)` (refuses to remove the last screen; reassigns primary/selected if needed), `setPrimaryScreen(id)`, `setSelectedScreen(id)`, `setScreenRole(id, role)`, `setAllScreenRoles(role)`, `moveScreenInSplit(id, -1 | 1)` (materialises the auto order into `splitOrder` first), `resetSplitOrder()`, `setDemoSideScreens(on)` + `demoSideScreens: boolean`.
- Demo side screens: ids `demo-left` / `demo-right`, 3.2 × 1.8 m, positions `[∓8.6, 3.4, -10.5]`, rotation Y `±0.45` rad turned towards the audience (left screen at −X gets +Y rotation so its normal points to +X/+Z), role `repeat`. Off by default. Switching to a custom venue removes them.
- `setCustomGlbUrl` with a new model resets `screens` to the default single screen (as it already resets views).
- `setVenueYaw`: rotate every **mesh-bound** screen with the room (position via `rotateAboutY`, rotation Y + delta, normalised), as it already does for seats.
- Store tests: the existing prop-placement tests read `screenPosition`; switch them to the primary screen.

`src/utils/screenLayout.ts` (pure):
- `UvRegion { u0, u1, v0, v1 }` (0..1, V bottom to top).
- `orderSplitScreens(screens, splitOrder)` → split-role screens in left-to-right order (explicit order first, unknown ids dropped, new split screens appended by ascending X).
- `computeScreenRegions({ screens, splitOrder, frame: { width, height } | null, cropMode, manualRepeatY, manualOffsetY })` → `Record<id, UvRegion>`.
  - `frame === null` means a still source (PDF, image, test pattern): the base region is the whole frame, as today (no letterbox).
  - Otherwise the base region comes from `computeUvCrop` against the screen's own size (repeat) or the split group's combined size (sum of widths × max height).
  - **Repeat:** each screen gets its own base region.
  - **Split:** contiguous pixels, gaps ignored. Screen *i* gets `u0 = base.u0 + baseWidth × (cum_i / W)`, width `baseWidth × (w_i / W)`, and the base's V range.
- `splitCanvasSize(screens)` → combined `{ width, height }` in metres of the split group (or null if none), for the test pattern.

`src/utils/screenMeshMeasure.ts` (pure):
- `measureScreenMesh(worldTriangles: Float32Array /* xyz × 3 per tri */, viewPoint)` → `{ center, width, height, yaw, facing }`. Area-weighted average of triangle normals, flipped to point towards `viewPoint`, horizontal component normalised → facing; `yaw = atan2(fx, fz)`. Project vertices onto right = up × facing = (fz, 0, −fx) (so a +Z-facing screen has right = +X) and up = +Y to get width/height (rounded to 0.1 m, minimum 1 m); centre = mid of projected extents, pushed forward by `SCREEN_STANDOFF` along facing. Tests: axis-aligned panel facing +Z, a panel turned 30°, a thick box picked from the front, a panel picked from behind.

### Step 2: rendering, picking and consumers (Sonnet subagent)
**Files:** `ScreenSurface.tsx` → `ScreenArray.tsx` (rename and update `StageCanvas.tsx`), `CustomGlbVenue.tsx`, `CameraController.tsx`, `FloorPlanView.tsx`, `VrControllerRig.tsx`, `PresenterSilhouette.tsx`, `discasMath.ts` (+ test).

- **One texture, many panels.** `ScreenArray` owns the single texture and hidden video element exactly as `ScreenSurface` does now (same effect, same disposal). It tracks the video frame size in local state (from `loadedmetadata` / `resize`). Crop no longer goes on `texture.repeat/offset`; instead each panel writes its `UvRegion` into its plane geometry's `uv` attribute (`applyUvRegion(geometry, region)`). Texture repeat/offset stay at 1/0. No texture clones.
- Test pattern: drawn at `splitCanvasSize` when any screen splits, else at the primary screen's size.
- Each `ScreenPanel` is a group at the screen's position/rotation with the bezel, the display plane and the underglow light, as today.
- Gizmo binds to the **selected** screen's group (bind to the group, not the mesh), and `onObjectChange` writes that screen's position.
- **Picking** (`CustomGlbVenue.handleMeshClick`): gather the mesh's world-space triangles (apply `matrixWorld`; handle indexed geometry), call `measureScreenMesh`.
  - If the only screen is unbound (the default), this is the **first pick**: keep today's behaviour of turning the venue by `alignScreenMesh().yawDelta` and probing the deck; the residual angle (measured yaw minus the quarter turn) becomes the screen's rotation Y. Replace the default screen with the bound one.
  - Otherwise **add** a screen (`Screen N`, role `repeat`, bound to the mesh), no venue turn, no deck probe.
  - Shift-click keeps picking mode on; a plain click ends it.
- **Telemetry:** `computeDiscasTelemetry` keeps its signature. `CameraController` computes it for every screen, publishes the primary's result plus `worst: { screenId, screenName, dhStatus, angleStatus } | null` when another screen is in a worse band (add an optional `worst` field to `DiscasTelemetry`). Add a pure `worstScreenTelemetry` helper in `discasMath.ts` with tests.
- Camera look target, presenter/lectern/panel props and VR look target and HUD text use the **primary** screen.
- Floor plan draws a marker for every screen (primary highlighted).

### Step 3: Screen tab UI, HUD and docs (Sonnet subagent)
**Files:** `Sidebar.tsx`, `TelemetryHUD.tsx`, VR HUD text in `VrControllerRig.tsx`, docs.

- Screen tab: a **screen list** (select, rename inline, set primary ★, remove, role toggle Split/Repeat for each), **Repeat on all / Split across all** buttons, **split order** with ◀ ▶ (or ↑ ↓) and an "Auto order" reset, a small **slice diagram** (proportional boxes labelled with each screen's name and its pixel range for a 1920×1080-per-slice example, or as a % of the source), the existing size presets and inputs acting on the selected screen, "Add screen from mesh" (custom venue) with a "shift-click to add several" hint, and a "Side screens" toggle (demo ballroom).
- HUD: when `telemetry.worst` is set, a small flag such as "Worst: Left screen — Marginal". Same line in the VR HUD.
- Docs: `content-sources.md` (repeat/split section, how the split is cut, stills vs video crop), `architecture.md` (store shape, `ScreenArray`, remove the "`screenMode` is unused" and update other known gaps), `sightline-telemetry.md` (primary + worst), `custom-venues.md` (adding several meshes, angled screens), `CHANGELOG.md` (Unreleased), `DECISIONS.md` entry.

### Step 4: verification (Opus, this session)
Lint, tests, build; review each diff; manual check in `npm run dev`: default screen, side screens repeat and split, screen share and PDF on a split, each crop mode, gizmo on a non-primary screen, floor plan, a custom GLB with two or three picked meshes (one angled) if a test GLB is available. VR not available here, so say so in the PR.

## Decided: don't relitigate
See `docs/DECISIONS.md` (2026-10-25: multi-screen repeat and split). Summary: plane over the picked mesh; facing from the mesh's surface; contiguous split by physical width; per-screen role; telemetry primary + worst; demo side screens off by default; no persistence.

## Gotchas
- Public repo: ask Graham before pushing or opening the PR.
- `react-hooks/immutability` is off for `src/components/canvas/` only; don't add new lint exceptions.
- three r170: writing to a geometry's `uv` attribute needs `needsUpdate = true`.

## State
Steps 1 to 4 done. Lint, 149 tests and build pass. Checked by hand in `npm run dev` (desktop browser):
- Demo ballroom: side screens on and off, Repeat on all, Split across all. The test pattern and sample deck slice contiguously across left, main and right.
- Custom GLB: a synthetic venue with a centre LED and two LEDs angled at ±0.5 rad. Shift-click picking, a plain click ending picking, the angled overlays, the 20/60/20 auto order, re-clicking a bound mesh selecting its screen, the gizmo moving a non-primary screen, and the worst-screen flag in the HUD.

Not checked: HDMI capture and screen share (they need a browser permission prompt), crop modes on a split video, and VR (no headset).

Follow-ups (both fixed in the follow-up PR, branch `fix/multiscreen-stills-and-split-heights`):
- ~~A repeat screen showing a still stretches it to the screen's shape.~~ With two or more screens, repeat screens now crop a still with the crop mode (Graham chose crop-to-fill over black bars, and to keep a lone screen showing the whole slide).
- ~~A split across screens of different heights uses one vertical range.~~ Each split screen now takes a centred V band in proportion to its height against the tallest.

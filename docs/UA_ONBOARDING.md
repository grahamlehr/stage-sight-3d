# StageSight 3D: onboarding guide

Generated from the Understand Anything knowledge graph at commit `bca2602` (29 October 2026). It is a map, not a spec: where it disagrees with the code or with [`AGENTS.md`](../AGENTS.md), trust those. Regenerate it with `/understand` then `/understand-onboard` after large changes.

## Project overview

StageSight 3D is a client-only web app for previewing ultra-wide event screens and LED walls from any seat in a 3D venue before load-in. You put your own content (PDF deck, image, HDMI capture or screen share) on a to-scale screen and read live AVIXA DISCAS sightline telemetry: viewing distance, D/H ratio and off-axis angle. It runs on desktop or in a WebXR headset. Rooms save to local `.stagesight` files, and camera views export to a branded storyboard PDF.

| | |
|---|---|
| Language | TypeScript (React 18 + TSX), with CSS, Markdown, YAML, and one Python and two shell tooling scripts |
| 3D | three.js through React Three Fiber and drei |
| State | Zustand: one store, `src/store/useStageStore.ts` |
| Styling | Tailwind CSS 4 (theme tokens in `src/index.css`) |
| Documents | pdf.js to read PDFs, pdf-lib to write the storyboard PDF, fflate for room-file zips |
| Build and test | Vite, Vitest, ESLint (zero warnings), Node 24 |
| Hosting | Static bundle on GitHub Pages; there is no backend |

Commands, environments and the full rules are in [`AGENTS.md`](../AGENTS.md) and [`CONTRIBUTING.md`](../CONTRIBUTING.md). The short version is `nvm use && npm ci`, then `npm run dev` on `http://localhost:5173`. Use `localhost`, not a LAN IP, because capture, screen share and WebXR need a secure context.

## Architecture layers

The app splits into a full-screen 3D canvas and a 2D overlay. Neither passes props to the other: both read and write the store.

```
index.html → main.tsx → App.tsx
                          ├── StageCanvas (3D scene)  ─┐
                          └── Sidebar, HUD, tray (UI) ─┴──► useStageStore ◄── pure utils in src/utils
```

| Layer | What belongs here | Key files |
|---|---|---|
| **App shell** | HTML entry, React bootstrap and the root component that composes the canvas with the overlay | `src/main.tsx`, `src/App.tsx`, `index.html` |
| **State store** | The single Zustand store for venue, screens, content, camera and seating, VR, storyboard, stage props, telemetry and room-file state. It is imported by 29 files, far more than any other | `src/store/useStageStore.ts` |
| **3D scene** | R3F components: the canvas, screens, camera rig, venues, presenters, floor plan and VR rig, plus the two people models | `StageCanvas.tsx`, `ScreenArray.tsx`, `CameraController.tsx`, `CustomGlbVenue.tsx`, `VrControllerRig.tsx` |
| **Procedural venue geometry** | Geometry factories, painted textures and layout constants that build the demo ballroom and stage props | `venue/RoomShell.tsx`, `venue/StageDeck.tsx`, `venue/roomLayout.ts`, `venue/venueTextures.ts`, `stagePropGeometry.ts` |
| **UI overlay** | The 2D React controls and the Tailwind theme | `Sidebar.tsx`, `TelemetryHUD.tsx`, `TransportBar.tsx`, `FirstRunGuide.tsx`, `src/index.css` |
| **Room files and storyboard export** | Saving and opening `.stagesight` rooms, GLB validation, downloads, storyboard capture and branded PDF export | `roomFile.ts`, `openRoomFile.ts`, `storyboard.ts`, `StoryboardRenderer.tsx`, `StoryboardTray.tsx`, `storyboardPdfExport.ts` |
| **Domain utilities** | Pure maths and content helpers: sightlines, layout, cropping, rasterising, poses | `discasMath.ts`, `screenLayout.ts`, `uvCropMath.ts`, `seatingLayout.ts`, `venueAlignment.ts`, `pdfRasterizer.ts` |
| **Tests** | 19 co-located Vitest files beside the code they cover | `*.test.ts` next to each util; `useStageStore.test.ts` |
| **Build and tooling config** | Manifest, TypeScript, Vite, ESLint, Node pin, Dependabot, git hooks and the GLB trimming script | `package.json`, `vite.config.ts`, `eslint.config.js`, `scripts/` |
| **CI/CD** | GitHub Actions for checks, secret scanning and the Pages deploy | `.github/workflows/*.yml` |
| **Documentation** | Agent rules, README, changelog, decisions, specs and feature guides | `AGENTS.md`, `docs/architecture.md`, `docs/DECISIONS.md` |

## Key concepts

- **The store is the only shared state.** New state that more than one component needs becomes a field and an action on `useStageStore`. Components select narrow slices in render. Event handlers and frame loops use `useStageStore.getState()` so they don't re-render.
- **Maths is pure and tested.** Sightline, layout, cropping, alignment, posing and PDF layout logic lives in `src/utils/` as pure functions with a `*.test.ts` beside each. That is why the numbers can be trusted separately from the scene. A fix needs a regression test that fails without it.
- **Physical units.** Sizes and positions are metres, Y is up, and the audience sits toward +Z. Custom venues are turned (by `venueAlignment.ts`) so the screen wall you pick faces +Z.
- **Resource lifecycle.** Textures are created in effects and disposed in cleanup, never derived during render. Blob URLs are revoked, media tracks stopped, and pdf.js documents destroyed. Files such as `ScreenArray.tsx`, `glbValidate.ts`, `useDisposables.ts` and `PresenterSilhouette.tsx` show the pattern. The rules are in [`docs/architecture.md`](architecture.md).
- **One shared texture, many screens.** `ScreenArray.tsx` owns a single texture (video, slide or test pattern). `screenLayout.ts` decides which UV region each screen shows: split screens slice one crop across them, while repeat screens crop individually. `uvCropMath.ts` handles the crop modes: auto-letterbox, top-aligned, fill and manual.
- **DISCAS telemetry.** `discasMath.ts` computes viewing distance, D/H and off-axis angle with status bands. `worstScreenFlag.ts` names the non-primary screen in a strictly worse band. `CameraController.tsx` throttles the updates, and the HUD and VR rig display them.
- **Nothing leaves the device.** Uploads, captures and screen shares stay in the tab. Room files and PDFs are built in the browser and saved through `download.ts`.
- **Lazy heavy dependencies.** pdf-lib is imported dynamically only when you export a storyboard, and pdf.js is pre-bundled by Vite.
- **Gizmos bind to groups, not meshes**, and global keyboard shortcuts ignore focus in `INPUT`, `TEXTAREA` and `SELECT` (see `TransportBar.tsx`).

## Guided tour

Follow these in order; each builds on the one before.

1. **Project overview.** Read [`README.md`](../README.md) and [`AGENTS.md`](../AGENTS.md) for what the app does and the rules it keeps.
2. **Entry point and app shell.** `src/main.tsx` loads fonts and global CSS and mounts `App.tsx`. `App.tsx` lays out the canvas, HUD, sidebar, transport bar, storyboard tray and first-run guide. It also warns before closing a tab with unsaved room edits and opens dropped `.stagesight` files.
3. **The Zustand store.** Read `useStageStore.ts` alongside `useStageStore.test.ts`; the tests show how each action is meant to behave, including room-file save and load and the storyboard capture lifecycle.
4. **The React Three Fiber scene.** `StageCanvas.tsx` hosts the lighting rig, venue, screens, presenters, camera, floor plan, VR rig and storyboard renderer. Look at `ScreenArray.tsx` and `screenLayout.ts` for the screens, and `CameraController.tsx` for the FOV toggle, seated placement, drag look-around and number-key hotkeys.
5. **Content pipeline.** `pdfRasterizer.ts` turns PDF pages and images into canvases capped at 4096 px and draws the sample deck. `uvCropMath.ts` maps the source onto each screen. `screenMaterialKey.ts` gives each screen material a React key so the material rebuilds when a screen switches between a still and live video, which avoids a double sRGB decode. `TransportBar.tsx` moves between slides.
6. **DISCAS maths and the HUD.** `discasMath.ts` and its tests, then `TelemetryHUD.tsx` and `worstScreenFlag.ts`. [`docs/sightline-telemetry.md`](sightline-telemetry.md) explains the bands and their limits.
7. **Venues.** `DemoBallroom.tsx` builds the default room from `RoomShell`, `StageDeck`, conference seating, `roomLayout` constants and seeded procedural textures. `CustomGlbVenue.tsx` loads an uploaded GLB, lets you click a mesh to bind it as a screen (turning the venue so that wall faces +Z), and falls back to the ballroom if loading fails. Uploaded venues get plain white side lights (`sideLightColours.ts`).
8. **Seating, people and the floor plan.** `seatingLayout.ts` and `clickToSit.ts` decide where a viewer can sit. `PresenterSilhouette.tsx` places the standing presenter pair, lectern and four-person panel using the bundled man and woman models, posed by `figurePose.ts` and laid out by `presenterPair.ts`. `FloorPlanView.tsx` is the top-down view for custom venues, where you place camera views.
9. **VR preview.** `VrControllerRig.tsx` runs the WebXR session on the same scene: it calibrates a seated rig, draws a telemetry HUD on a canvas texture, and teleports you with a controller ray to the floor. See [`docs/vr-preview.md`](vr-preview.md).
10. **Room files.** `roomFile.ts` is the pure `.stagesight` format: it builds the document from store state, validates and migrates it, and packs or unpacks the zip. `openRoomFile.ts` adds the unsaved-changes prompt, and `download.ts` saves files locally. The spec is [`docs/specs/room-file-and-storyboard.md`](specs/room-file-and-storyboard.md).
11. **Storyboard capture and PDF export.** `storyboard.ts` builds the shot list and pre-capture warnings. `StoryboardRenderer.tsx` renders each shot off-screen at a fixed supersampled size and encodes JPEGs without disturbing the live view. `StoryboardTray.tsx` is the capture and review UI. `storyboardPdf.ts` holds the pure page-layout helpers, and `storyboardPdfExport.ts` builds the PDF with pdf-lib and the agency branding from `agencyBranding.ts`. See [`docs/storyboard.md`](storyboard.md).
12. **Tests, CI and deploy.** `ci.yml` runs lint, tests and the build on every PR. `secret-scan.yml` and the pre-commit hook run gitleaks. Merging to `main` publishes to GitHub Pages through `deploy-pages.yml`, so `main` must always be releasable.

## File map

Paths are under `src/` unless shown otherwise. Tests (`*.test.ts`) sit beside the file they cover and are not listed.

**App shell**
- `main.tsx`: Vite entry; loads fonts and CSS and mounts `App` in StrictMode.
- `App.tsx`: root layout; unsaved-room warning; opens dropped room files.
- `index.html`, `vite-env.d.ts`: HTML entry and ambient Vite types (including `__APP_VERSION__`).

**State store**
- `store/useStageStore.ts`: all shared state and actions, including room save and load and storyboard capture.

**3D scene** (`components/canvas/`)
- `StageCanvas.tsx`: the R3F canvas and everything mounted in it.
- `ScreenArray.tsx`: screens with bezels, cropped display planes, the shared texture and the selection gizmo.
- `CameraController.tsx`: camera modes, seating, look-around, hotkeys and throttled telemetry.
- `CustomGlbVenue.tsx`: GLB venue loading, screen binding, click-to-sit and an error-boundary fallback.
- `FloorPlanView.tsx`: orthographic floor plan with a section cut and view placement.
- `DemoBallroom.tsx`: assembles the procedural ballroom.
- `PresenterSilhouette.tsx`: presenters, lectern and seated panel, with disposal.
- `VrControllerRig.tsx`: WebXR session, controllers, VR HUD and teleport.
- `StoryboardRenderer.tsx`: off-screen shot rendering for the storyboard.
- `public/models/business-man.glb`, `business-woman.glb`: the people models, trimmed with `scripts/trim-glb-animations.py`.

**Procedural venue geometry** (`components/canvas/venue/` and `stagePropGeometry.ts`)
- `RoomShell.tsx`, `StageDeck.tsx`, `ConferenceSeating.tsx`: room, stage and instanced chairs.
- `roomLayout.ts`: ballroom dimensions and layout maths.
- `venueTextures.ts`: seeded, canvas-painted textures.
- `banquetChair.ts`, `geometryHelpers.ts`, `stagePropGeometry.ts`: geometry builders.
- `useDisposables.ts`: hook that disposes three.js resources.

**UI overlay** (`components/ui/`)
- `Sidebar.tsx`: Source, Screen and Venue tabs; the largest file in the project.
- `TelemetryHUD.tsx`: header badges and the main controls, including VR entry.
- `TransportBar.tsx`: slide counter, thumbnails and keyboard navigation.
- `FirstRunGuide.tsx`: six-step spotlight tour that targets `data-guide` attributes.
- `AboutModal.tsx`, `Logo.tsx`: About dialogue and SVG logo.
- `index.css`: Tailwind 4 theme tokens and base styles.

**Room files and storyboard export**
- `utils/roomFile.ts`: the `.stagesight` format.
- `utils/openRoomFile.ts`: the shared open flow.
- `utils/glbValidate.ts`: structural check plus a real `GLTFLoader` parse.
- `utils/download.ts`: local file save.
- `utils/storyboard.ts`: camera-view maths and the shot list.
- `utils/storyboardPdf.ts`, `utils/storyboardPdfExport.ts`: PDF layout and generation.
- `utils/agencyBranding.ts`: remembered agency name and logo.
- `components/ui/StoryboardTray.tsx`: storyboard UI.

**Domain utilities** (`utils/`)
- `discasMath.ts`, `worstScreenFlag.ts`: sightline maths and the worst-screen flag.
- `screenLayout.ts`, `uvCropMath.ts`, `screenMaterialKey.ts`: how content maps onto screens.
- `pdfRasterizer.ts`, `testPatternGenerator.ts`: content ingestion and the alignment pattern.
- `floorPlan.ts`, `venueAlignment.ts`, `screenMeshMeasure.ts`: floor-plan, venue-turning and mesh-measuring maths.
- `seatingLayout.ts`, `clickToSit.ts`: seating layout and click-to-sit rules.
- `figurePose.ts`, `presenterPair.ts`: posing and placing the people models.
- `sideLightColours.ts`, `firstRunGuide.ts`: small helpers.

**Tooling, CI and docs**
- `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.nvmrc`: build and lint config.
- `scripts/install-hooks.sh`, `scripts/hooks/pre-commit`: gitleaks pre-commit hook.
- `.github/workflows/`: `ci.yml`, `secret-scan.yml`, `deploy-pages.yml`; `.github/dependabot.yml`.
- `docs/`: see [`docs/README.md`](README.md) for the index.

## Complexity hotspots

These files are the largest or most involved. Read the tests and the relevant doc before changing them.

| File | Lines | Why care is needed |
|---|---|---|
| `components/ui/Sidebar.tsx` | 1,216 | Every source, screen and venue control in one component; almost all of it reads and writes the store |
| `store/useStageStore.ts` | 1,116 | Imported by 29 files; a change here reaches the whole app. Its test file is 822 lines |
| `utils/pdfRasterizer.ts` | 676 | pdf.js lifecycle, canvas size caps and the procedural sample deck |
| `components/canvas/VrControllerRig.tsx` | 664 | WebXR session, calibration and gamepad polling; only verifiable on a headset |
| `utils/roomFile.ts` | 511 | File format with validation and version migrations; keep old files loading |
| `utils/testPatternGenerator.ts` | 484 | Large canvas drawing routine |
| `components/ui/FirstRunGuide.tsx` | 420 | Depends on `data-guide` attributes elsewhere in the UI |
| `components/ui/StoryboardTray.tsx`, `TelemetryHUD.tsx` | 418 each | Dense UI with several modes and popovers |
| `components/canvas/stagePropGeometry.ts` | 397 | Merged geometry with a triangle budget for Quest |
| `components/canvas/venue/venueTextures.ts`, `RoomShell.tsx` | 350, 317 | Procedural textures and the room build; deterministic by design |
| `components/canvas/PresenterSilhouette.tsx`, `utils/figurePose.ts` | 341, 173 | Rigged-model posing with IK-style foot placement |
| `components/canvas/CameraController.tsx`, `ScreenArray.tsx`, `FloorPlanView.tsx`, `CustomGlbVenue.tsx` | 250–290 | Camera, texture and pointer interactions that the automated tests do not cover |

The 3D scene, media capture and VR have no automated tests. [`AGENTS.md`](../AGENTS.md#manual-testing) lists what to check by hand after touching them.

# StageSight 3D

Preview ultra-wide event screens and LED walls from any seat in the room before load-in. StageSight 3D puts your actual content on a to-scale screen in a 3D venue and reports live AVIXA DISCAS sightline telemetry — viewing distance, distance-to-height ratio and off-axis angle — as you move between seats, on a desktop or in a VR headset.

**Live app:** https://grahamlehr.github.io/stage-sight-3d/

## Features

- **Screens** — 16:9, 21:9, 32:9, 3:1 and 4:1 presets, custom physical dimensions, and a drag gizmo for placement. Add several screens, repeat or split content across them, or pick screens from meshes in your own venue model.
- **Content** — an aspect-matched test pattern, a PDF deck, a single PNG or JPEG, a live HDMI capture card, or a screen share. A five-slide 32:9 sample deck is built in. Slides are stretched to the screen, so export decks at the screen's aspect ratio.
- **Ultra-wide cropping** — fixes 16:9 EDID sources on ultra-wide walls: centered, top-aligned, 1:1 or manual crop.
- **Venues** — a procedural ballroom with adjustable size and stage height, or upload your own `.glb` (or a self-contained `.gltf`) authored in meters.
- **Sightline telemetry** — live D/H ratio and horizontal off-axis angle against the bands below, plus 50° room-context and 25° eye-focus FOV modes.
- **Occlusion checks** — a 1.8m standing presenter, a lectern and a four-person seated panel, each movable on the stage.
- **Lighting** — conference, ballroom and keynote presets.
- **VR preview** — sit in any seat with a WebXR headset, with an in-headset telemetry HUD and controller teleporting.

### Telemetry bands

| Metric | Good | Caution | Problem |
| --- | --- | --- | --- |
| D/H ratio | < 4× analytical detail · 4–6× basic reading | 6–8× small text at risk | > 8× beyond DISCAS max |
| Horizontal off-axis | < 30° | 30–45° | > 45° |

D/H is the 3D distance from the viewer's eye to the screen center, divided by the screen height. Off-axis is measured in the horizontal plane against the screen's facing direction. Both are measured to the screen center. [Sightline telemetry](docs/sightline-telemetry.md) covers the math and what it leaves out, including edge angles on ultra-wide screens.

## Controls

A short tour walks through these on first visit. Tick **Don't show again** to stop it appearing, and reopen it any time from the StageSight 3D logo → **Take the tour**.

### Desktop

| Input | Action |
| --- | --- |
| Left-drag | Orbit (orbit view) · look around (seated view) |
| Right-drag · scroll | Pan · zoom (orbit view) |
| Click floor | Sit there (seated view) |
| <kbd>Shift</kbd> + click floor | Sit there (orbit view) |
| <kbd>1</kbd>–<kbd>4</kbd> | Seat presets |
| <kbd>L</kbd> | Cycle lighting preset |
| <kbd>←</kbd> <kbd>→</kbd> · <kbd>Page Up</kbd> <kbd>Page Down</kbd> · <kbd>Space</kbd> | Previous / next slide |
| <kbd>R</kbd> | Recenter VR view |
| <kbd>H</kbd> | Show / hide VR HUD |

### VR controllers

| Input | Action |
| --- | --- |
| Trigger (pointing at floor) | Teleport to that seat |
| A / X | Next seat preset |
| B / Y | Recenter view and reset seated eye height |
| Grip | Cycle lighting preset |
| Thumbstick left / right | Previous / next slide (decks) · seat presets (otherwise) |
| Thumbstick click | Show / hide HUD |

## VR preview

VR uses WebXR (`immersive-vr`). On a PC, connect a Meta Quest through **Quest Link / Air Link** or **Virtual Desktop (VDXR)** and make it the active OpenXR runtime, then choose **Enter VR**. The view starts seated at 1.2m eye height, facing the stage. See [VR preview](docs/vr-preview.md) for calibration and troubleshooting.

## Documentation

| Doc | Covers |
| --- | --- |
| [Content sources and cropping](docs/content-sources.md) | Decks, capture cards, screen share and ultra-wide crop modes |
| [Custom venues](docs/custom-venues.md) | Preparing a `.glb` and picking screens from its meshes |
| [VR preview](docs/vr-preview.md) | Headset setup, calibration and troubleshooting |
| [Sightline telemetry](docs/sightline-telemetry.md) | How D/H and off-axis are computed, and their limits |
| [Architecture](docs/architecture.md) | State, scene, content pipeline and lifecycle rules |
| [Contributing](CONTRIBUTING.md) | Setup, checks, conventions and pull requests |
| [Changelog](CHANGELOG.md) | What has changed |

## Getting started

Requires Node 24 (pinned in [`.nvmrc`](.nvmrc)).

```bash
nvm use
npm ci
npm run dev
```

Then open http://localhost:5173.

### Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run lint` | Run ESLint, failing on any warning |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Project structure

```
src/
  components/
    canvas/   3D scene: venue, screen, occlusion props, camera and VR rig
    ui/       Sidebar, top HUD, slide transport bar, about modal
  store/      Single Zustand store holding all app state
  utils/      DISCAS and UV-crop math, PDF rasterizing, test-pattern drawing
docs/         Guides, reference and architecture (see docs/README.md)
```

The math in `src/utils/discasMath.ts` and `src/utils/uvCropMath.ts` is pure and has unit tests next to it.

Built with React 18, TypeScript, Vite, three.js through React Three Fiber and drei, Zustand, Tailwind CSS and pdf.js.

## CI and deployment

- **CI** ([`ci.yml`](.github/workflows/ci.yml)) runs lint, tests and the typechecked build on every pull request and every push to `main`.
- **Deploy** ([`deploy-pages.yml`](.github/workflows/deploy-pages.yml)) builds and publishes to GitHub Pages on every push to `main`. The Vite `base` is `./`, so the build works under the `/stage-sight-3d/` subpath.

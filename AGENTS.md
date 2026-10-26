# StageSight 3D

<!-- Rules only, kept under ~200 lines. Status and history go in docs/ (see Doc map). CLAUDE.md is a one-line stub (@AGENTS.md). -->

## What this is
A client-only web app for previewing ultra-wide event screens and LED walls from any seat in a 3D venue before load-in. Users put their own content (PDF deck, image, HDMI capture, screen share) on a to-scale screen and read live AVIXA DISCAS sightline telemetry (viewing distance, D/H ratio, off-axis angle), on desktop or in a WebXR headset. Good means the numbers are physically right and nothing leaks while the user switches content.

## Stack
- React 18 + TypeScript + Vite 5, three.js via React Three Fiber and drei, Zustand, Tailwind CSS 4 (Vite plugin; theme tokens in `src/index.css` `@theme`, no config file), pdf.js
- Vitest for tests, ESLint (zero warnings) for lint. Node 24 (`.nvmrc`, `engines`)
- No backend. Static bundle hosted on GitHub Pages

## Commands
| Task | Command |
|---|---|
| Install | `nvm use && npm ci` |
| Dev | `npm run dev` (http://localhost:5173; use `localhost`, not a LAN IP, because capture, screen share and WebXR need a secure context) |
| Test | `npm test` (watch: `npm run test:watch`) |
| Lint | `npm run lint` (fails on any warning) |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` (runs `tsc --noEmit`, then Vite build to `dist/`) |
| Deploy | Merging to `main` auto-publishes to GitHub Pages via `deploy-pages.yml` |

CI (`ci.yml`) runs lint, tests and build on every PR and push to `main`; all must pass.

## Environments
| Env | URL / host | How to reach it | Notes |
|---|---|---|---|
| Local | `http://localhost:5173` | `npm run dev` | |
| Staging | none | n/a | There is no staging step |
| Prod | https://grahamlehr.github.io/stage-sight-3d/ | Push/merge to `main` (GitHub Pages, environment `github-pages`) | **Protected**: real users. Changes need Graham's explicit OK. Vite `base` is `./` so it works under the `/stage-sight-3d/` subpath |

`main` must always be releasable because merging deploys. Public repo: never add private data or secrets.

## Invariants
- State goes in the store. Add fields and actions to `useStageStore` (`src/store/useStageStore.ts`) instead of passing props or adding local state other components need. Select narrow slices in render; use `useStageStore.getState()` in event handlers and frame loops.
- Keep math pure and tested. Geometry and sightline math lives in `src/utils/` as pure functions with a `*.test.ts` beside it. New behaviour or a fix to existing math needs a test; a fix needs a regression test that fails without it.
- Clean up what you create: dispose textures, revoke blob URLs, stop media tracks, destroy pdf.js documents. Details in `docs/architecture.md#resource-lifecycle-rules`.
- Never derive textures during render. Create them in an effect and dispose in its cleanup.
- Route uploaded files through the store action that owns them (`setCustomGlbUrl`), which revokes the previous blob URL.
- Bind gizmos to the group, not the mesh.
- Keep physical units: sizes and positions are metres, Y is up, the audience sits toward +Z.
- Never disable lint rules to get a change through. Existing exceptions are documented in place (`react-hooks/immutability` off for `src/components/canvas/`; two `set-state-in-effect` sites). A new exception needs the same kind of justifying comment.
- Global keyboard shortcuts must ignore form fields: return early when focus is on `INPUT`, `TEXTAREA` or `SELECT`.
- Uploads, capture streams and screen shares stay in the browser tab. Never add a backend or send user content off-device without Graham's OK.
- Secrets live in `.env` (gitignored). Never commit, print or log them; `.env.example` lists every variable without values. The app currently needs none.
- Commit messages use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), with the reason in the body; a fix names the bug, not just the code touched.
- Branch from `main` and open PRs against `main`.
- Do not change `ci.yml` or `deploy-pages.yml` without Graham's OK.
- Run `scripts/install-hooks.sh` once per clone to enable the gitleaks pre-commit hook (needs `brew install gitleaks`).

## External APIs
None. The app calls no third-party HTTP APIs and has no paid services (no Stripe or similar). It uses browser APIs only: `getUserMedia` (HDMI capture), `getDisplayMedia` (screen share) and WebXR.

Rules for if one is ever added: tests and exploratory runs never call paid or rate-limited APIs. Use test keys only, never live keys in tests. Store fixtures in `tests/fixtures/<api>/`, record one once with Graham's OK and a stated number of calls, then replay it. Mock at the client boundary. Add the API to a table here (API / cost / test rule).

## Manual testing
The 3D scene, media capture and VR have no automated tests. Check them by hand in `npm run dev` and say in the PR what you checked:
- Scene or screen changes: orbit and seated views, the transform gizmo, every content source touched.
- Content pipeline: load a PDF, an image and the sample deck; use the transport bar and arrow keys.
- Capture or crop: test a screen share at least, and each crop mode.
- VR: test on a headset if possible. If not, say so in the PR; reasoning about WebXR code is not the same as running it.

## Doc map
- `docs/HANDOFF.md`: current state and prompt for the next session (`/handoff`)
- `docs/DECISIONS.md`: decisions already made. Don't relitigate them.
- `docs/architecture.md`: store, scene, content pipeline, lifecycle rules, known gaps
- `docs/sightline-telemetry.md`, `docs/content-sources.md`, `docs/custom-venues.md`, `docs/vr-preview.md`: feature references
- `docs/README.md`: index of all docs; `docs/archive/`: retired docs (follow the steps in its README)
- `CONTRIBUTING.md`: setup, workflow, conventions; `CHANGELOG.md`: what changed
- `docs/STATUS.md`, `docs/HISTORY.md`: create when needed

## Definition of done
1. `npm run lint`, `npm test` and `npm run build` pass.
2. Docs touched by the change are updated in the same PR (controls, telemetry bands, sources, setup), including this file when commands, environments or conventions change. A doc that stops being true and isn't worth fixing moves to `docs/archive/`.
3. The PR says where it was verified: local, and what was checked by hand (see Manual testing).
4. Use `/ship` to commit and open the PR, and `/tidy` to clean up afterwards.

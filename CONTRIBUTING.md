# Contributing

Thanks for helping with StageSight 3D. This guide covers setup, the checks a change has to pass and the conventions the code follows.

## Setup

You'll need Node 24. The version is pinned in [`.nvmrc`](.nvmrc) and in `engines` in `package.json`.

```bash
nvm use
npm ci
npm run dev
```

The dev server runs at http://localhost:5173. Use `localhost`, not your LAN IP: capture, screen share and WebXR only work in a secure context.

## Workflow

1. Branch from `main`.
2. Make your change and run the checks below.
3. Open a pull request against `main`. CI ([`ci.yml`](.github/workflows/ci.yml)) runs lint, tests and the typechecked build, and all three must pass.
4. **Merging deploys.** Every push to `main` publishes to GitHub Pages through [`deploy-pages.yml`](.github/workflows/deploy-pages.yml). There's no staging step, so `main` must always be releasable.

### Checks

Run these before pushing. They're what CI runs.

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

`npm run lint` fails on any warning, not just errors. `npm run build` runs `tsc --noEmit` before the Vite build.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes, as the history does: `feat:`, `fix:`, `chore:`, `docs:`, `test:` or `refactor:`. Put the reason for the change in the body. Name the bug a fix addresses, not just the code it touches.

## Conventions

[Architecture](docs/architecture.md) explains the reasoning. In short:

- **State goes in the store.** Add fields and actions to [`useStageStore`](src/store/useStageStore.ts) instead of passing props or adding local state that other components need. Select narrow slices in render, and use `useStageStore.getState()` in event handlers and frame loops.
- **Keep math pure and tested.** Geometry and sightline math belongs in `src/utils/` as pure functions, with a `*.test.ts` next to it. New behavior, or a fix to existing math, needs a test. A fix should include a regression test that fails without it.
- **Clean up what you create.** Dispose textures, revoke blob URLs, stop media tracks and destroy pdf.js documents. The [resource lifecycle rules](docs/architecture.md#resource-lifecycle-rules) list them.
- **Keep physical units.** Sizes and positions are meters. The audience sits toward +Z.
- **Don't disable lint rules to get a change through.** Two exceptions exist, and both are documented in place: `react-hooks/immutability` is off for `src/components/canvas/` because three.js objects are mutated imperatively, and two `set-state-in-effect` sites sync with external systems. A new exception needs the same kind of justifying comment.
- **Global keyboard shortcuts must ignore form fields.** Return early when focus is on an `INPUT`, `TEXTAREA` or `SELECT`.

## Testing what unit tests can't

The 3D scene, media capture and VR have no automated tests. Check them by hand in `npm run dev`, and say in the PR what you checked:

- **Scene or screen changes.** Check orbit and seated views, the transform gizmo and every content source your change touches.
- **Content pipeline changes.** Load a PDF, an image and the sample deck. Use the transport bar and the arrow keys.
- **Capture or crop changes.** Test with a screen share at the very least, and try each crop mode.
- **VR changes.** Test on a headset if you can. If you couldn't, say so in the PR. Reasoning about the WebXR code isn't the same as running it.

## Documentation

Docs live in the [README](README.md) and [`docs/`](docs/README.md). If a change alters behavior that a doc describes (controls, telemetry bands, sources, setup), update the doc in the same PR. If a doc stops being true and isn't worth fixing, move it to [`docs/archive/`](docs/archive/README.md) following the steps there.

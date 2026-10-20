# Changelog

All notable changes to StageSight 3D are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

No release has been tagged yet. `main` deploys continuously to GitHub Pages, and `package.json` is at `0.1.0`.

## [Unreleased]

### Added

- **Venue rotation.** The Venue tab can turn a custom model in quarter turns so its screen wall faces the audience. The seat turns with the room (2026-10-20).
- **Realistic default ballroom.** Theatre-style conference seating with center, side and cross aisles; upholstered banquet chairs on steel frames; paneled walls with walnut wainscot, pilasters and sconces; double doors with exit signs; an acoustic tile ceiling with downlights; a skirted stage with carpeted stairs, handrails and a velour drape; and procedural carpet, fabric, wood and tile textures. Clicking a chair sits in it (2026-10-19).
- **First-run tour.** A six-step guide that spotlights the sidebar, navigation, telemetry, FOV and lighting, and VR controls, with buttons to try each one live. It can be dismissed for good and reopened from the About panel (2026-10-19).
- **Docs.** A docs folder covering architecture, sightline telemetry, content sources, custom venues and VR preview, plus a contributing guide, this changelog and an archive policy (2026-10-19).
- **Tooling.** CI on every pull request: ESLint (zero warnings), Vitest and the typechecked build. Node 24 is pinned in `.nvmrc` (2026-10-19).
- **Tests.** 30 unit tests for the DISCAS and UV-crop math (2026-10-19).
- **README.** Features, telemetry bands, controls, VR setup, scripts and the deploy flow (2026-10-19).
- **VR preview.** Meta Quest WebXR mode with seated calibration, controller teleporting, gamepad bindings and an in-headset telemetry HUD (2026-10-16).
- **Deployment.** The GitHub Pages workflow and StageSight 3D branding (2026-10-16).
- **Occlusion props.** Separate presenter and lectern toggles, and a four-person seated panel with PBR materials (2026-10-15).
- **Lighting.** A venue lighting rig with house and stage intensity, the conference, ballroom and keynote presets, and ceiling fixtures (2026-10-15).
- **MVP.** Procedural ballroom and custom `.glb` venues, screen presets and the transform gizmo, test pattern, PDF, image, capture card and screen-share sources, ultra-wide UV cropping, seat presets, and live D/H and off-axis telemetry (2026-10-15).

### Changed

- **Occlusion props.** The presenter, panelists, lectern, tub chairs and side tables were rebuilt to look like real people and furniture at real scale. People have proportioned heads, necks, shoulders, hands and shoes, suits with shirts, lapels and ties, skin tones and hair, and seated poses with crossed legs and arms on armrests. The lectern is walnut with a sloped desk, notes and a gooseneck mic. Each person is three draw calls, and the full set is about a quarter of the old draw calls (2026-10-19).
- **CI and deploy.** The deploy workflow moved from Node 20 (end of life) to Node 24, and the checkout and setup-node actions moved to v5 (2026-10-19).
- **Test deck.** `StageSightTest.pptx`, `.DS_Store` and duplicate root logo files are no longer tracked (2026-10-19).
- **Guides removed.** Title-safe, action-safe and 16:9 center-cut guides are gone from the test pattern (2026-10-15).

### Fixed

- **Side-facing screen walls.** Picking a screen mesh on a wall that faces sideways or backwards now turns the venue so the wall faces +Z, then binds the preview screen flat on it, 2cm proud of the face. Before, the screen stayed side-on to the wall with no way to rotate it, and the off-axis reading was measured against the wrong direction (2026-10-20).
- **Gizmo drags.** Dragging a gizmo handle no longer moves the camera. In orbit view the camera used to start orbiting partway through the drag, and in seated view the press also looked around and the camera re-aimed at the screen on every move (2026-10-19).
- **Prop offsets.** The presenter and lectern now default to 4m either side of center and the panel to 1m in front of the screen, so turning the panel on no longer puts its outer chairs inside the presenter and lectern. All three props, contact shadows included, sit at least 0.35m back from the deck's front edge; the lectern used to stand on the lip and the panel hung 0.2m past it (2026-10-19).
- **Lectern orientation.** The lectern's front panel now faces the audience. It used to face the screen (2026-10-19).
- **Gizmo.** Dragging the screen no longer collapses it to the room origin, because the transform gizmo now drives the screen group (2026-10-19).
- **Mesh binding.** Bound screens are measured in world space, so centimeter-authored models no longer produce 800m-wide screens (2026-10-19).
- **Portrait PDFs.** Pages are fitted to 4096px on their longest edge instead of their width, which fixes oversized textures and memory exhaustion. Pages that fail to render now raise an error instead of being dropped (2026-10-19).
- **Capture crop.** The UV crop is recomputed once the real video resolution is known, which fixes mis-cropped non-16:9 sources (2026-10-19).
- **Top-aligned crop.** Horizontal crops are centered instead of left-aligned (2026-10-19).
- **Slide advances.** Moving between slides no longer re-encodes every slide at full resolution on the main thread (2026-10-19).
- **Slide shortcuts.** Slide keys no longer capture typing or range-slider input in the sidebar (2026-10-19).
- **Memory leaks.** Uploaded venue files are released when replaced or when they fail to load, and pdf.js documents are destroyed after rasterizing (2026-10-19).
- **Error boundary.** The custom venue's error boundary no longer updates state during render (2026-10-19).
- **VR calibration.** Calibration now happens once on the first valid pose, ordinary leaning no longer snaps the view, and a failure while ending a session no longer leaves the app stuck in VR mode (2026-10-19).
- **VR entry height.** VR now starts at a 1.2m seated eye height, and the view no longer drops through the floor (2026-10-16).
- **Panel chairs.** The tub chairs in the panel prop were rotated so they face the right way (2026-10-15).

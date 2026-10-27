# Changelog

All notable changes to StageSight 3D are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

`main` deploys continuously to GitHub Pages. Changes merged since the last release collect under Unreleased until the next version is cut.

## [Unreleased]

### Added

- **Two presenters on stage.** The standing presenter is now a man (1.8m) and a woman (1.68m) side by side, using low-poly CC-BY models by Quaternius from Poly Pizza, credited in the README and the About dialogue. The presenter offset places the pair's centre, and the Screen tab calls them **Presenters** (2026-10-27).
- **Several screens.** The Screen tab lists every screen: select, rename, remove, set the primary one, and give each a **Repeat** or **Split** role. Repeat screens show the whole source; split screens share one source, sliced contiguously by physical width in left-to-right order (automatic by position, or reordered by hand). A slice diagram shows each screen's share. **Repeat on all** and **Split across all** set every role at once (2026-10-25).
- **Several screens from a custom venue.** After the first pick, **Add screen from mesh** adds a screen over each further mesh; shift-click adds several in a row. A screen's facing follows its mesh, so angled wing screens are turned to match, and picking a bound mesh again selects its screen (2026-10-25).
- **Demo ballroom side screens.** A **Side screens** toggle adds two angled screens for trying out repeat and split (2026-10-25).
- **Worst-screen flag.** The telemetry reads from the primary screen. When another screen is in a worse band from the current seat, the HUD and the VR HUD add a line such as "Worst: Left screen · Marginal" (2026-10-25).

### Changed

- **Seat Presets menu links to the floor plan.** In an uploaded venue with no camera views placed yet, the menu has an **Open floor plan to place views** button. It opens the sidebar on the Venue tab with the floor plan showing and the first empty view selected (2026-10-27).
- **Uploaded venues get white side lights.** The two side lights stay blue and amber in the demo ballroom, but are white in an uploaded venue. Plain white or grey models came out blue on one side and brown on the other (2026-10-27).
- **One texture, per-screen UVs.** `ScreenArray` replaces `ScreenSurface`. Video crop applies to the combined split group; stills are shown whole and sliced; the test pattern is drawn at the combined size (2026-10-25).
- **Tailwind CSS 4.** The theme (CueSmith colours, square corners, Archivo, three weights) moves from `tailwind.config.js` into an `@theme` block in `src/index.css`, and Tailwind runs as a Vite plugin (`@tailwindcss/vite`), so `postcss.config.js` and `autoprefixer` are gone. The UI looks the same: Tailwind 3's fixed line heights are kept, and the thumbnail tray keeps its slim scrollbar. Hover styles now apply only on devices that can hover (2026-10-26).

### Fixed

- **Header menus stay open and buttons stay solid.** The Lighting and Seat Presets menus sat a few pixels below their buttons, so the pointer could fall into the gap on its way down and the menu closed. The gap is now part of the menu's hover area. Hovering a header button also replaced its background with a faint tint, so the 3D view showed through it; the hover now darkens the button's own background. The buttons' browser tooltips, which covered the menus, are gone (2026-10-27).
- **Screen shares and capture keep their colours.** A live feed that replaced the test pattern or a slide reused a material built for a still, so it skipped the video's sRGB decode and came out washed out and shifted towards blue. Switching back made stills too dark. The screen's material is now rebuilt when it switches between a still and video (2026-10-27).
- **Looking around no longer moves the seat.** In seated view, the press that started a look-around drag also counted as click-to-sit, and a press on a screen reached the floor behind it, so the seat jumped to the front of the stage. Click-to-sit now needs a click without a drag, on a floor or chair with nothing in front of it (2026-10-27).
- **Repeat screens no longer stretch stills.** With several screens, a repeat screen crops a slide or the test pattern to its own shape using the crop mode, instead of stretching it. A single screen still shows the whole slide (2026-10-25).
- **Shorter split screens are no longer squashed.** Each split screen takes a vertically centred band of the source in proportion to its height against the group's tallest screen (2026-10-25).

## [1.0.0] - 2026-10-25

First stable release. It covers everything built since the MVP on 2026-10-15.

### Added

- **Floor plan for custom venues.** A top-down plan with an adjustable section cut lets you place and point four camera views on the venue's floor. Keys 1–4, the Seat Presets menu and VR cycling use them in place of the ballroom's fixed seats, and a view keeps the clicked floor height and heading so balconies and raked tiers work. Views reset when a different model is uploaded and turn with the venue (2026-10-20).
- **Stage floor height for custom venues.** Picking the screen mesh finds the stage in front of it and stands the presenter, lectern and panel on it. A **Stage Floor Height** slider on the Screen tab adjusts it by hand (2026-10-20).
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

- **About panel copy.** The subtitle now reads "Screen, Content & Sightline Previewer", the four feature cards describe live content, custom screen ratios, bespoke venue models and content masking, the version tag drops "MVP" and the footer is just "StageSight 3D" (2026-10-20).
- **Occlusion props.** The presenter, panelists, lectern, tub chairs and side tables were rebuilt to look like real people and furniture at real scale. People have proportioned heads, necks, shoulders, hands and shoes, suits with shirts, lapels and ties, skin tones and hair, and seated poses with crossed legs and arms on armrests. The lectern is walnut with a sloped desk, notes and a gooseneck mic. Each person is three draw calls, and the full set is about a quarter of the old draw calls (2026-10-19).
- **CI and deploy.** The deploy workflow moved from Node 20 (end of life) to Node 24, and the checkout and setup-node actions moved to v5 (2026-10-19).
- **Test deck.** `StageSightTest.pptx`, `.DS_Store` and duplicate root logo files are no longer tracked (2026-10-19).
- **Guides removed.** Title-safe, action-safe and 16:9 center-cut guides are gone from the test pattern (2026-10-15).

### Fixed

- **Picking the screen mesh no longer appears to move the camera.** The orbit camera now turns with the venue, so the room no longer spins under a still camera (2026-10-20).
- **Floating props in custom venues.** The occlusion props used the demo ballroom's 1m deck height in every venue, so they floated 0.7m above a real venue's 0.3m stage (2026-10-20).
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

[Unreleased]: https://github.com/grahamlehr/stage-sight-3d/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/grahamlehr/stage-sight-3d/releases/tag/v1.0.0

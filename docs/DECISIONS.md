# Decisions

Decisions recorded here are settled. Raise a concern once, briefly, rather than reopening one.

<!-- Template:
## YYYY-MM-DD: <decision in one line>
**Context:** why it came up.
**Decision:** what we chose.
**Alternatives:** what we didn't choose, and why.
-->

## 2026-11-04: Use the Signal design system, with the logo's cyan as the highlight
**Context:** Graham wants StageSight to match his other tools, which use his Signal design system (`~/Documents/Signal Design System`). The app had used a CueSmith-derived palette.
**Decision:** Signal's dark theme, mapped onto the existing Tailwind tokens and component classes in `src/index.css` rather than copying the `.sg-*` layer, so components keep their class names. The highlight is the electric cyan from the StageSight logo (`#06e5f7`) in place of Signal green: a fill with ink-dark text on it for primary buttons, pressed and selected states, the active tab and focus. Red stays reserved for the live state, and green and amber for sightline health. Geist and Geist Mono are self-hosted through `@fontsource` so the app still makes no third-party requests. Panels drop soft shadows; dialogs and popovers get Signal's 2px rule and hard offset shadow.
**Alternatives:** Signal's light theme (fights the dark 3D scene). The logo's royal blue `#183ead` (too dark to read as a fill on an ink ground). Loading Geist from Google Fonts, as Signal ships it (a third-party request from a client-only app).

## 2026-10-25: Stay on React 18 / R3F 8 and take majors by hand
**Context:** Dependabot opened separate React 19, React DOM 19 and R3F 9 PRs. Each failed `npm ci` because drei 9 pins React 18 and R3F 8, so none can land alone.
**Decision:** Stay on React 18, React DOM 18, R3F 8 and drei 9 for now. `dependabot.yml` ignores major bumps for `react`, `react-dom`, their `@types` and `@react-three/*`; minor and patch updates still arrive. Do the React 19 upgrade as one hand-made branch when there's a reason to.
**Alternatives:** Merging the bumps one at a time (impossible: peer conflicts). Ignoring these dependencies entirely (would also block React 18 security patches).

## 2026-10-25: Multiple screens that repeat or split one source
**Context:** Real rooms often feed one source to several screens: the same image repeated on left and right, or one ultra-wide output cut across left, centre and right walls. The app modelled a single screen.
**Decision:** The store holds a list of screens. Each has a role: `repeat` (shows the whole source) or `split` (takes its slice of the source). A split cuts contiguous pixels in proportion to each screen's physical width, left to right as the audience sees it, with gaps ignored. A picked GLB mesh gets a to-scale preview plane over it, facing the way the mesh's surface faces, so angled side screens work. Telemetry reports the primary screen and flags the worst screen if it is in a worse band. The demo ballroom offers optional side screens, off by default. Screen setups are not saved between sessions.
**Alternatives:** Painting onto the GLB mesh itself (its UVs are often unreliable). One layout mode for all screens (real rooms mix a split centre with repeated sides). A continuous image across the gaps, like a projection blend (not how LED processors cut a wide output). Reporting only the primary or only the faced screen (hides a bad seat for the outer screens).

## 2026-10-29: Save rooms as a local `.stagesight` file that holds the room, not content
**Context:** The content team re-uploads the venue GLB and rebuilds screens and views every session, and wants to hand a set-up room to colleagues. Accounts with cloud storage were considered. Spec: `docs/specs/room-file-and-storyboard.md`.
**Decision:** A downloadable `.stagesight` file holds the venue (with the GLB embedded in full), screens, saved views and stage dressing, with a `formatVersion` and tested migrations. It never holds content: decks, images, streams and device choices stay live and transient. No accounts or backend. This replaces "screen setups are not saved between sessions" from 2026-10-25.
**Alternatives:** Accounts and cloud storage (needs a backend, and puts clients' confidential content on a server). Referencing the GLB instead of embedding it (smaller files, but a re-pick on every open, which is the pain being fixed). Storing content in the file (a dependency and version-control burden, and most content is live capture anyway).

## 2026-10-29: Saved views store a full camera
**Context:** The storyboard PDF compares a speaker's draft with the agency's concept from the same viewpoints, so frames must line up exactly. Seat views stored only floor position and yaw.
**Decision:** Each saved view stores position, yaw, pitch and field of view, all taken from the current camera when the view is placed. Older views load with the pitch the app showed them with (aimed at the primary screen centre's height) and the default field of view, so their framing doesn't change. (Amended 2026-10-29 by Graham: the spec first said level pitch, but the app never showed old views level.)
**Alternatives:** Keeping position and yaw only (frames would drift with whatever pitch and FOV the user had at capture time).

## 2026-11-04: Sidebar in setup order, with file and viewing controls in the top bar
**Context:** The three sidebar tabs (Source, Screen, Venue) grew feature by feature and ran against the order a room is set up in. Help text sent users between tabs, lighting and room files sat in the wrong places, and the Screen tab mixed every-screen and selected-screen settings with stage props.
**Decision:** Four numbered tabs in setup order: 1 Venue, 2 Screens, 3 Stage, 4 Content. The sidebar opens on Content, because the ballroom loads by default and loading content is the quickest win. Room files (name, notes, save, open) live in a room menu in the top bar, since they cover the whole room. Lighting lives only in the top-bar menu, beside the FOV toggle, as a viewing condition. Camera views are edited in a panel that shows while the floor plan is open.
**Alternatives:** Three tabs with Stage under Screens (keeps the longest scroll, and splits stage height from the props that stand on it). Opening on Venue (correct order, but slower to a first result). Lighting in both places (two sources of truth).

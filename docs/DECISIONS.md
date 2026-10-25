# Decisions

Decisions recorded here are settled. Raise a concern once, briefly, rather than reopening one.

<!-- Template:
## YYYY-MM-DD: <decision in one line>
**Context:** why it came up.
**Decision:** what we chose.
**Alternatives:** what we didn't choose, and why.
-->

## 2026-10-25: Stay on React 18 / R3F 8 and take majors by hand
**Context:** Dependabot opened separate React 19, React DOM 19 and R3F 9 PRs. Each failed `npm ci` because drei 9 pins React 18 and R3F 8, so none can land alone.
**Decision:** Stay on React 18, React DOM 18, R3F 8 and drei 9 for now. `dependabot.yml` ignores major bumps for `react`, `react-dom`, their `@types` and `@react-three/*`; minor and patch updates still arrive. Do the React 19 upgrade as one hand-made branch when there's a reason to.
**Alternatives:** Merging the bumps one at a time (impossible: peer conflicts). Ignoring these dependencies entirely (would also block React 18 security patches).

## 2026-10-25: Multiple screens that repeat or split one source
**Context:** Real rooms often feed one source to several screens: the same image repeated on left and right, or one ultra-wide output cut across left, centre and right walls. The app modelled a single screen.
**Decision:** The store holds a list of screens. Each has a role: `repeat` (shows the whole source) or `split` (takes its slice of the source). A split cuts contiguous pixels in proportion to each screen's physical width, left to right as the audience sees it, with gaps ignored. A picked GLB mesh gets a to-scale preview plane over it, facing the way the mesh's surface faces, so angled side screens work. Telemetry reports the primary screen and flags the worst screen if it is in a worse band. The demo ballroom offers optional side screens, off by default. Screen setups are not saved between sessions.
**Alternatives:** Painting onto the GLB mesh itself (its UVs are often unreliable). One layout mode for all screens (real rooms mix a split centre with repeated sides). A continuous image across the gaps, like a projection blend (not how LED processors cut a wide output). Reporting only the primary or only the faced screen (hides a bad seat for the outer screens).

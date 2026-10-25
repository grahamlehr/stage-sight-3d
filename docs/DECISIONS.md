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

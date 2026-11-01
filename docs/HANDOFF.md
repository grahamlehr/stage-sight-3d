# Handoff: no work in progress
_Updated 2026-11-01 · branch `main` · no open PRs_

## Goal
Nothing is in progress. Phases 1 and 2 of [the room file and storyboard spec](specs/room-file-and-storyboard.md) are built and merged.

## Done
- Room files: `.stagesight` save and open (#48). Verified by hand locally: a custom venue with 3 screens and 4 views matched after save, reload and drop-open; corrupt, newer and bad-GLB files left the room untouched.
- Storyboard capture and PDF export (#49), and the migration note (#50). Verified by hand locally.
- Full-repo review fixes (#51) and the generated onboarding guide (#52).

## Next
1. Phase 3 of the spec (flythrough video) is the only planned work left, and it hasn't been started. Check with Graham before picking it up.

## Open decisions (need Graham)
None.

## Decided: don't relitigate
- See [DECISIONS.md](DECISIONS.md).
- Zip: **fflate** (tree-shaken `zipSync`/`unzipSync`, about 8 kB min). JSZip was rejected (about 95 kB min).
- PDF: **pdf-lib**, lazy-loaded with `import()` so the main bundle doesn't grow. jsPDF was rejected (optional html2canvas and dompurify baggage).

## Not verified
Screen share and HDMI capture in a storyboard (they need a real picker or device), Chrome's own PDF viewer (checked with pdf.js, macOS PDFKit and Poppler instead), Edge and SharePoint preview, and VR.

## Gotchas
- A hidden browser pane never measures the R3F canvas (it stays 300×150), so dispatch a window `resize` event. After HMR, import the store via the URL in `performance.getEntriesByType('resource')`.
- The right-hand header group overflows below about 1760 px. **VR Preview** is off-screen at 1440 px, a gap that predates the storyboard work, which is why the **Storyboard** button sits in the left group.
- Storyboard colour depends on three.js render-target behaviour. Re-check it on every three.js upgrade ([architecture](architecture.md#storyboard-capture)).

## State
- Public repo: ask Graham before each push and PR. Merging deploys to production.

## Prompt for the next session
~~~text
Repo: ~/Projects/Stage Sight 3D, branch from main. Read AGENTS.md and docs/HANDOFF.md first.
Nothing is in progress. Ask Graham what to work on; phase 3 of docs/specs/room-file-and-storyboard.md (flythrough video) is the only planned work left.
Decisions in docs/DECISIONS.md are locked.
Plan and review with Opus. Hand mechanical steps to Sonnet subagents, each given only the files it needs and what done looks like. Verify yourself before calling anything done, locally with npm run dev.
The app calls no third-party APIs. This is a public repo, so ask before any push, PR or merge.
Do the whole scope without stopping between steps unless blocked.
~~~

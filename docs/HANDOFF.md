# Handoff
_Updated 2026-10-29 · branch `feat/room-file` (from `main` at e68bf43) · PR not opened yet_

## Goal
Build [the room file and storyboard spec](specs/room-file-and-storyboard.md), phases 1 and 2 only (phase 3, flythrough video, is out of scope). Phase 1 and phase 2 get separate branches and PRs. Public repo: ask Graham before each push and PR.

## Dependencies (told Graham; carry on unless he objects)
- Zip: **fflate** (tree-shaken `zipSync`/`unzipSync`, about 8 kB min). JSZip rejected (about 95 kB min).
- PDF: **pdf-lib**, lazy-loaded with `import()` so the main bundle doesn't grow. jsPDF rejected (optional html2canvas and dompurify baggage).

## Phase 1: `.stagesight` room file (R1–R7) · branch `feat/room-file`
- `src/utils/roomFile.ts` (+ test): pure. `RoomDocument` v1, `roomFromState` (whitelist, no content), `parseRoomDocument` (validate, then migrate through a migration table; a newer `formatVersion` is refused), `roomToState`, `roomKey` (for the unsaved-changes check), `packRoomFile` / `unpackRoomFile` (zip with `room.json` and `venue.glb`), `roomFileName`, `inspectGlb` (header check).
- `src/utils/glbValidate.ts`: a full `GLTFLoader.parseAsync` check that disposes what it parses.
- `src/utils/download.ts`: `downloadBlob`, which revokes its URL.
- Store: `roomName`, `roomNotes`, `roomBaseline`, `setRoomName`, `setRoomNotes`, `saveRoom()`, `loadRoom(file)`. The GLB loads through `setCustomGlbUrl`.
- UI: a Room file section at the top of the Venue tab; drag and drop of a `.stagesight` file onto the canvas; an unsaved-changes confirm before opening and a `beforeunload` prompt.
- The first real migration arrives with phase 2 (v1 → v2, full-camera views). Phase 1 tests the migration runner with a synthetic table.

## Phase 2: storyboard and PDF (R8–R19) · branch `feat/storyboard` (from `feat/room-file` if unmerged)
Not started.

## Status
- [x] Phase 1 implemented (Sonnet subagent), lint/test/build pass (196 tests)
- [x] Phase 1 verified by hand in dev (custom venue 3 screens/4 views save → reload → drop-open matches; corrupt, newer, bad-GLB files leave room untouched; ballroom round trip has no GLB; unsaved prompt). 220 MB GLB zips in 0.6 s in Node.
- [ ] Phase 1 committed; push and PR waiting on Graham's OK (public repo)
- [ ] Phase 2 implemented
- [ ] Phase 2 verified and PR opened

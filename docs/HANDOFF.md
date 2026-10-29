# Handoff
_Updated 2026-10-29 · phase 1 PR https://github.com/grahamlehr/stage-sight-3d/pull/48 (`feat/room-file`) · phase 2 committed on `feat/storyboard` (from `feat/room-file`), push and PR waiting on Graham's OK_

## Goal
Build [the room file and storyboard spec](specs/room-file-and-storyboard.md), phases 1 and 2 only (phase 3, flythrough video, is out of scope). Phase 1 and phase 2 get separate branches and PRs. Public repo: ask Graham before each push and PR.

## Dependencies (told Graham; carry on unless he objects)
- Zip: **fflate** (tree-shaken `zipSync`/`unzipSync`, about 8 kB min). JSZip rejected (about 95 kB min).
- PDF: **pdf-lib**, lazy-loaded with `import()` so the main bundle doesn't grow. jsPDF rejected (optional html2canvas and dompurify baggage).

## Phase 1: `.stagesight` room file (R1–R7) · branch `feat/room-file`
- `src/utils/roomFile.ts` (+ test): pure. `RoomDocument` v1, `roomFromState` (whitelist, no content), `parseRoomDocument` (validate, then migrate through a migration table; a newer `formatVersion` is refused), `roomToState`, `roomKey` (for the unsaved-changes check), `packRoomFile` / `unpackRoomFile` (zip with `room.json` and `venue.glb`), `roomFileName`, `inspectGlb` (header check).
- `src/utils/glbValidate.ts`: `parseGlb` (a full `GLTFLoader.parseAsync` check) and the stash that hands the parsed scene to `CustomGlbVenue`, so a room's model is parsed once.
- `src/utils/download.ts`: `downloadBlob`, which revokes its URL.
- Store: `roomName`, `roomNotes`, `roomBaseline`, `setRoomName`, `setRoomNotes`, `saveRoom()`, `loadRoom(file)`. The GLB loads through `setCustomGlbUrl`.
- UI: a Room file section at the top of the Venue tab; drag and drop of a `.stagesight` file onto the canvas; an unsaved-changes confirm before opening and a `beforeunload` prompt.
- The first real migration arrives with phase 2 (v1 → v2, full-camera views). Phase 1 tests the migration runner with a synthetic table.

## Phase 2: storyboard and PDF (R8–R19) · branch `feat/storyboard` (from `feat/room-file` if unmerged)
- 2A (done): full-camera views `{position, yaw, pitch, fov, name}` + `seatPitch`, `getLiveCameraPose`, room file v2 + migration v1→v2 (old views keep the pitch they showed: aimed at screen-centre height), `src/utils/storyboard.ts` (shots, warnings), `StoryboardRenderer.tsx` (2400×1350 render target with `isXRRenderTarget` so tone mapping matches live view; JPEG 0.85), store sets/frames with URL revocation.
- 2B (done): review tray UI (R11, R12 presenter prompt, R15 warning, R16 extra shots UI, R17), PDF export via lazy pdf-lib (R13, R18 logo in localStorage, R19 appendix), docs.

## Status
- [x] Phase 1 implemented (Sonnet subagent), lint/test/build pass (196 tests)
- [x] Phase 1 verified by hand in dev (custom venue 3 screens/4 views save → reload → drop-open matches; corrupt, newer, bad-GLB files leave room untouched; ballroom round trip has no GLB; unsaved prompt). 220 MB GLB zips in 0.6 s in Node.
- [x] Phase 1 committed (9fb68dd), pushed with Graham's OK, PR #48 open
- [x] Phase 2 implemented (two Sonnet agents) and verified by hand in dev
- [ ] Phase 2 push and PR (ask Graham first)

### Phase 2 notes from hand testing (2026-10-29)
- Fixed during verification: MSAA + `isXRRenderTarget` reads back black (now 2× supersampling), and the sRGB texture storage double-encoded (now `internalFormat = 'RGBA8'`; frames match the live canvas to 0.5/255).
- The Storyboard button moved to the left header group: the right-hand group overflows below ~1760 px (VR Preview was already off-screen at 1440 px before this work: a pre-existing gap).
- Browser-pane testing quirk: a hidden pane never measures the R3F canvas (stays 300×150); dispatch a window `resize` event. After HMR, import the store via the URL in `performance.getEntriesByType('resource')`.
- Not verified: screen share and HDMI capture (need a real picker/device), Chrome's own PDF viewer (checked with pdf.js, macOS PDFKit and Poppler instead), Edge and SharePoint preview, VR.

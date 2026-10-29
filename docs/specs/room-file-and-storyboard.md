# Spec: `.stagesight` room file and storyboard PDF

**Status:** Draft for review · **Date:** 2026-10-29 · **Owner:** Graham

## Problem statement

Clients and speakers prepare content for a 4 m × 12 m LED wall on a 13" laptop in PowerPoint for the web, so they design for a 50" TV in a meeting room. They waste a canvas with huge creative scope, and the agency has no quick, shareable way to show them the room at true scale. Inside the agency, the content team rebuilds each venue (re-uploading the GLB, placing screens and seats) every session, which slows down testing ideas on screens.

## Context and decisions already made

These came out of the brainstorm and are not open for this version:

- **No accounts and no backend.** Everything stays in the browser tab, in line with AGENTS.md.
- **The `.stagesight` file holds the room, never content.** Content arrives live via window or screen share, HDMI or a loaded deck. Storing it would create a dependency and a version-control problem we don't want.
- **The report is about scale and ambition, not legibility.** The agency owns text sizing and templates. The PDF is a "flythrough on paper" that sells the size of the canvas. DISCAS numbers are not on the client pages.
- **The report is built from live snapshots during a session.** Snapshots exist only until the PDF is exported.
- **The file embeds the venue GLB.** Opening a room is one step, even though files are larger.
- **Saved views store a full camera:** position, yaw, pitch and field of view, so A/B frames line up exactly.

## Goals

1. **Venue setup in under a minute.** Opening a `.stagesight` file restores the venue, screens and camera views with no other steps (today: several minutes of re-uploading and placing).
2. **A shareable storyboard from a live session in under 5 minutes.** From "content is on screen" to "PDF in hand".
3. **A/B in the same frames.** The speaker's draft and the agency's concept appear from identical viewpoints, so the comparison is fair.
4. **Fewer "make it look like a TV slide" conversations.** Measured qualitatively by the agency (see Success metrics).

## Non-goals

| Not in this version | Why |
|---|---|
| User accounts, cloud storage, share links | Needs a backend; reverses a standing decision. Revisit only if files prove insufficient. |
| Storing content (decks, images, video) in the file | Dependency and version-control burden; content is usually live capture anyway. |
| Flythrough video export | Follow-on phase; reuses the same camera path once storyboards work. |
| Legibility checking or font-size advice | The agency owns this; it isn't the problem we're solving. |
| Full agency report templates or theming | A logo plus event and speaker names is enough for v1. |
| Auto-restoring the last session from browser storage | Useful, but a separate small piece of work (see P2). |

## Users and stories

**Content team (agency).** Builds venues, tests ideas live on screens, sends the storyboard.

1. As a content designer, I want to open a saved room file so that I can test content in the venue without rebuilding it.
2. As a content designer, I want to save the room I've set up so that a colleague can open exactly the same venue, screens and views.
3. As a content designer, I want to capture a set of frames from fixed viewpoints with whatever is live on screen so that I can show a client their content in the room.
4. As a content designer, I want to capture a second set with different content from the same viewpoints so that the client can compare their draft with our concept.
5. As a content designer, I want to check and remove bad frames before export so that a notification or the wrong window never reaches the client.
6. As a content designer, I want to export a branded PDF so that I can send it by email or SharePoint like any other document.

**Client or speaker (receives the PDF only).**

7. As a speaker, I want to see my slide in the actual room with people in it so that I understand how big the canvas is.
8. As a speaker, I want to see my draft and the agency's idea side by side from the same seat so that I can see what the space makes possible.

**Edge cases**

9. As a content designer, opening a file whose venue GLB is missing or corrupt, I want a clear message and the rest of the room still loaded where possible.
10. As a content designer, opening a file saved by an older version of the app, I want it to load without me doing anything.
11. As a content designer capturing with no content source active, I want to be warned rather than get frames of a test pattern by accident.

## Requirements

### Phase 1: the `.stagesight` room file

**P0: must have**

- **R1. Save room.** "Save room" downloads a single `.stagesight` file containing:
  - the venue source (demo ballroom or custom), and for a custom venue the GLB itself, embedded in full, plus `venueYaw` and `customDeckHeight`;
  - screens (`screens`, `primaryScreenId`, `splitOrder`, `demoSideScreens`) including any bound mesh names;
  - camera views (`customSeatViews`) and any storyboard shots (R8);
  - room dressing: stage size, lighting preset and intensities, ceiling fixtures, presenter, lectern and panel toggles and offsets.
  - It contains **no** content: no slides, images, streams, device IDs or crop settings tied to a source.
- **R2. Open room.** "Open room" (button, and drag-and-drop on the canvas) restores everything in R1. The GLB goes through `setCustomGlbUrl` so the previous blob URL is revoked.
- **R3. Versioned format.** The file carries a `formatVersion`. Loading runs pure, tested migrations from any earlier version. A file from a *newer* app version shows "This room was saved by a newer version of StageSight" and doesn't half-load.
- **R4. Validation.** A malformed file, or a GLB that fails to parse, shows a plain-English error and leaves the current room untouched.
- **R5. Stays local.** Saving and opening never send anything off the device.

Acceptance criteria:
- [ ] Save a custom venue with 3 screens and 4 placed views, reload the page, open the file: the venue, screens, gizmo-placed positions and views match exactly.
- [ ] The saved file contains no slide images or stream data (checked by a test on the serialiser).
- [ ] A file at version N−1 loads in version N (migration test per bump).
- [ ] A corrupt file leaves the current scene as it was.
- [ ] The demo ballroom saves and opens without embedding any GLB.

**P1: nice to have**

- **R6. Room name and notes.** A name ("Hilton Park Lane, Ballroom A") and a free-text note, shown on open and used as the default filename.
- **R7. Unsaved changes prompt.** Opening a room or leaving the page with unsaved room edits asks first.

### Phase 2: storyboard capture and PDF

**P0: must have**

- **R8. Storyboard shots.** The storyboard uses the room's camera views (the four seat views) as its shots, in order. Each view stores a full camera: position, yaw, pitch and field of view. Placing or updating a view captures all four from the current camera, so frames line up exactly between variants. Views saved before this change (position and yaw only) load with the pitch they were shown with (aimed at the screen centre's height) and the default field of view, so their framing doesn't change.
- **R9. Capture a set.** "Capture storyboard" steps through every placed shot, renders each one at export resolution with the live content on screen, and stores the frames as a labelled set ("Your draft"). The live view returns to where the user was.
- **R10. Several sets.** The user can switch content and capture again as a new set ("Our concept"). At least 2 sets; the limit is set by memory, not by design.
- **R11. Review tray.** Before export, show all frames grouped by set and shot. The user can rename a set, retake one shot, or delete a frame or a set.
- **R12. People in shot.** Frames include the presenter and panel figures when they're switched on, and capture prompts once to switch the presenter on if it's off, because people are what make the scale readable.
- **R13. Export PDF.** Generated in the browser. Landscape pages:
  1. Cover: agency logo, event name, speaker name, date.
  2. One page per shot, frames full-bleed. With two sets, show them stacked or side by side on the same page with set labels. With one set, one frame per page.
  3. A short caption per shot (the view's name, for example "Back of room").
  - No DISCAS numbers on these pages.
- **R14. Snapshots are temporary.** Frames live in memory only. Closing the tray, exporting or reloading clears them; all render targets, canvases and blob URLs are disposed (architecture.md lifecycle rules).
- **R15. No-source warning.** Capturing while the source is the test pattern, or a stream has ended, warns first.

Acceptance criteria:
- [ ] Two sets captured with different window shares produce frames from pixel-identical viewpoints.
- [ ] A 4-shot, 2-set PDF is under 15 MB and opens in Chrome's and Edge's built-in PDF viewers and in SharePoint preview.
- [ ] After export and closing the tray, a memory snapshot shows no retained frame canvases or render targets.
- [ ] Deleting a frame removes it from the PDF.
- [ ] Capture works with screen share, HDMI capture, a PDF deck and an image source.

**P1: nice to have**

- **R16. Extra shots beyond seats.** Add up to 4 named shots that aren't seats, saved in the room file: a walk-in view from the doors, and the speaker's view from the stage at standing eye height.
- **R17. "Capture this view".** Add the current camera as a one-off frame to the active set.
- **R18. Agency logo saved locally.** Remember the logo and agency name in browser storage so it isn't picked each time (a convenience only; the PDF still works without it).
- **R19. Technical appendix.** An optional final page with D/H and off-axis per shot, for production teams, off by default.

**P2: future (design for, don't build)**

- **Flythrough video** from the same shot list: interpolate the camera between shots and record the canvas. Keep shots as data (position, direction, FOV) so a path can be built from them.
- **Auto-restore the last room** from IndexedDB on reload, using the same serialiser as R1.
- **Accounts and share links**, only if files prove insufficient. Keep the serialiser independent of how the file is transported.

## Technical considerations (for engineering)

- **Serialiser as pure functions** in `src/utils/` (`roomFile.ts` with `roomFile.test.ts`): store state → plain object → file, and back, with migrations. The store gets `saveRoom` and `loadRoom` actions.
- **Container format.** A zip holding `room.json` and `venue.glb` keeps the JSON readable and the GLB as is. This needs a small zip library (for example fflate); confirm the bundle cost.
- **Capture rendering.** Render each shot to an off-screen render target at a fixed size (for example 2400 × 1350) rather than reading the visible canvas, so frames don't depend on window size or `preserveDrawingBuffer`. Video textures must have a fresh frame before each render.
- **PDF library.** None is bundled today (pdf.js only reads). Candidates: pdf-lib or jsPDF. Lazy-load it so the main bundle doesn't grow. Embed frames as JPEG at about quality 0.85.
- **Capture source quality.** A frame is only as sharp as the incoming stream. Document that shares should run at the source's highest resolution.

## Success metrics

The app has no analytics, and adding any would send data off-device, so these are tracked by the agency, not by the app.

**Leading (first few weeks)**
- The content team opens a room from a file instead of rebuilding it for **every** repeat venue (target: 100% of repeat venues after 2 weeks).
- Time from "content on screen" to "PDF exported": **under 5 minutes** (stretch: 2).
- Storyboards sent: at least **one per event** with a speaker on a large-format canvas.

**Lagging (one to three months)**
- Fewer late-stage "re-do it as a normal slide" requests, judged by the content team against the previous quarter.
- Speakers who accept or build on the agency's concept after seeing the A/B storyboard (track by hand: target over half).

## Open questions

| Question | Who | Blocking? |
|---|---|---|
| Two sets on one page (stacked) or alternating pages? Test both with a real PDF on a 13" laptop. | Design | No |
| Do we need MP4 for the later video phase (PowerPoint, iPhone)? Browser recording usually gives WebM. | Engineering | No (phase 3) |
| Is a 2400 × 1350 frame sharp enough with a 1080p HDMI feed across a 12 m wall? | Engineering | No |
| Is there a practical size limit for an embedded GLB (browser memory when zipping a 200 MB venue)? | Engineering | No |

## Phasing

1. **Phase 1: room file** (R1–R5, then R6–R7). Independent and immediately useful to the content team.
2. **Phase 2: storyboard and PDF** (R8–R15, then R16–R19). Depends on phase 1 for saved shots.
3. **Phase 3: flythrough video.** Reuses the phase 2 shot list.

**Validate before phase 2:** for the next speaker who's thinking small, make the storyboard by hand from screenshots of the current app (people in shot, their slide, plus one agency concept) and see whether the conversation changes.

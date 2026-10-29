# Storyboard capture and PDF

A storyboard is a "flythrough on paper": your content on the real screen, seen from the room's camera views, with people on stage for scale. It sells the size of the canvas to a speaker or client. It isn't a legibility report, so the client pages carry no DISCAS numbers.

## The shots

The storyboard uses the room's camera views as its shots, in order:

- **Demo ballroom:** the four fixed seat presets, each looking at the primary screen's centre.
- **Uploaded venue:** the views you placed on the floor plan (see [Custom venues](custom-venues.md#camera-views-and-the-floor-plan)), with their names, then any **extra shots**.

Each view stores a full camera: where it is, which way it faces (yaw and pitch) and its field of view. Every set is rendered from exactly the same cameras, so an A/B pair lines up pixel for pixel.

**Extra shots** (up to four per venue) cover viewpoints that aren't seats, such as a walk-in view from the doors or the speaker's view from the stage at standing eye height. Stand there in the 3D view, open **Extra shots** in the Storyboard panel and choose **Add current view as shot**. They're saved in the room file.

## Capturing

1. Put your content on the screen (any source: a deck, an image, a screen share or an HDMI capture).
2. Choose **Storyboard** in the header. The panel opens on the right and the 3D view stays usable.
3. Name the set (it starts as **Your draft**) and choose **Capture storyboard**. Every shot is rendered off-screen at 2400 × 1350, whatever the window size, and your own view doesn't move.
4. Switch the content, for example to the agency's concept, and capture again. The second set is named **Our concept**. Capture as many sets as memory allows.

**Capture this view** adds the current camera as a one-off frame to the latest set.

Before a capture, the app warns you if the screen is showing the test pattern, an empty deck or a stream that has ended. It also offers once to switch the presenters on, because people in shot make the scale readable.

### Frame quality

A frame is only as sharp as what is on the screen. Run screen shares and capture cards at the source's highest resolution (the app asks for up to 3840 × 2160). Frames are rendered at twice their size and scaled down, which smooths edges, and then saved as JPEG at quality 0.85.

## Reviewing

Frames are grouped by set. You can rename a set, delete a set, delete a frame, or **retake** a shot from the same camera. Click a thumbnail to see it larger. Check every frame for notifications or the wrong window before you export.

## Exporting the PDF

Fill in the event name, speaker, date, agency name and logo, then choose **Export PDF**. The PDF is built in the browser and downloads straight away.

- **Cover:** logo, event name, speaker name, date and agency.
- **One page per shot**, with each set's frame full-bleed and stacked, labelled with the set name, and the shot's name in the corner. With one set, it's one frame per page.
- **Technical appendix** (off by default): distance, D/H and off-axis per shot, for production teams. Long storyboards continue onto further pages, 14 rows each.

A 4-shot, 2-set storyboard is about 2–3 MB. The agency name and logo are remembered in this browser for next time. The PDF uses the standard PDF fonts, so characters outside Western European alphabets are left out of names.

## Frames are temporary

Frames live only in this tab's memory while the panel is open. Closing the panel, exporting or reloading the page discards them, and the app releases their memory. Nothing is uploaded.

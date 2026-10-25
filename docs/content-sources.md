# Content sources and cropping

The **Source** tab chooses what is shown on the screen. Everything is processed in the browser. Nothing is uploaded anywhere.

## Sources

| Source | How it reaches the screen | Notes |
| --- | --- | --- |
| Test pattern | Drawn to a 4096px-wide canvas at the screen's aspect ratio | The default. It is redrawn whenever the screen's width or height changes, so it always fits exactly. |
| Sample deck | Five built-in 32:9 slides, 4096 × 1152 px | Good for checking legibility on the default 32:9 screen. |
| PDF | Each page rendered by pdf.js, scaled so its longest edge is 4096px | Pages are rendered once, on upload, with progress shown. Large decks use a lot of memory: up to about 67MB per page, for a square page. |
| PNG / JPEG | Scaled so the longest edge is 4096px | Loads as a one-slide deck. Smaller images are upscaled. |
| HDMI capture | `getUserMedia`, asking for up to 3840 × 2160 at 60 fps | Choose the device from **Video Device**. Use the refresh button after plugging in a capture card. |
| Screen share | `getDisplayMedia`, asking for up to 3840 × 2160 | When you stop sharing in the browser, the screen goes back to the test pattern. |

### Browser requirements

- **Capture and screen share need a secure context:** HTTPS (the deployed app) or `localhost` (the dev server). On a plain-HTTP LAN address they aren't available.
- **Device names can be blank until you grant camera permission once.** Before then the list shows `Device <id>`. Start the capture once, allow access, then refresh the list.
- **4096px is the texture ceiling.** Many GPUs cap textures at 4096px, which is why slides are fitted to that size. Rendering larger would only make three.js downscale them again.

## Slides are stretched to fit

PDF, image and sample-deck slides are mapped onto the whole screen (or, on a split group, the whole group; see [several screens](#several-screens-repeat-and-split)) with no cropping or letterboxing. **On a single screen, a slide with a different aspect ratio from the screen will look stretched.** (With several screens, repeat screens crop the slide to their shape instead; see [cropping and stills](#cropping-and-stills).) To preview a 32:9 wall, export the deck at 32:9 (for example 5760 × 1620 or 7680 × 2160). Then the preview matches what the wall will show.

To move between slides, use the transport bar, <kbd>←</kbd> <kbd>→</kbd>, <kbd>Page Up</kbd> <kbd>Page Down</kbd> or <kbd>Space</kbd>, or the VR thumbstick.

## Ultra-wide cropping (video sources only)

Video sources often arrive as a 16:9 frame even when the content is meant for an ultra-wide wall. A 32:9 program is commonly letterboxed inside a 1920 × 1080 EDID signal. The **Ultra-Wide Letterbox Cropper** appears for HDMI capture and screen share, and it chooses which part of the frame fills the screen.

Below, `aCapture` is the source's width divided by its height and `aScreen` is the screen's. The math is in [`src/utils/uvCropMath.ts`](../src/utils/uvCropMath.ts).

| Mode | UI label | Screen wider than source | Screen narrower than source |
| --- | --- | --- | --- |
| `auto-letterbox` | Centered (Show) | Crops a centered horizontal band of height `aCapture / aScreen` | Crops a centered vertical band of width `aScreen / aCapture` |
| `top-aligned` | Top-Aligned | Crops the same-height band, anchored to the top of the frame | Same as Centered. This mode only anchors vertically. |
| `fill-1-to-1` | Fill 1-to-1 | Uses the whole frame, stretched to the screen | Same |
| `manual` | Manual | **Repeat Y** (0.1–1.0) sets the band's height. **Offset Y** (0–0.9) moves it up from the bottom of the frame. The offset is clamped so the band stays inside the frame. | Same; full width |

The crop is recalculated whenever the source's real resolution becomes known or changes, for example when a shared window is resized. Changing the screen size recalculates it too.

### Which mode to use

- **Centered** is for a source that sends ultra-wide content letterboxed in the middle of a 16:9 frame, which is the usual EDID workaround.
- **Top-Aligned** is for a processor that packs ultra-wide content at the top of the frame.
- **Fill 1-to-1** is for a source whose native resolution already matches the wall.
- **Manual** is for any other layout. Adjust it until the band covers exactly the active content.

## Several screens: repeat and split

A room can hold more than one screen (the **Screen** tab lists them). Each screen has a role:

- **Repeat** shows the whole source, cropped to that screen's own shape. Use it for confidence monitors and side screens that mirror the main picture.
- **Split** shows its own slice of the source. Split screens form one group that the source is spread across.

**Repeat on all** and **Split across all** set every screen's role at once.

### How the split is cut

- The slices are **contiguous and sized by physical width**. A 12m screen beside a 4m screen takes 75% and 25% of the source width. Gaps between the screens are ignored.
- The slices run **left to right as the audience sees them**. By default the order follows each screen's X position (**auto order**). The **Split Order** list on the Screen tab moves a screen left or right; that pins a manual order until you press **Auto order**. The slice diagram under it shows each screen's share of the source width.
- The group's **combined size** is its widths added up by its tallest height. That size, not any single screen, is what the source is cropped to.
- A split screen **shorter than the tallest** shows a vertically centred band of the source, as tall as it is relative to the tallest screen. A 3m screen beside a 4.5m one shows the middle two-thirds of the source's height, so nothing is squashed.

### Cropping and stills

- **Video** (HDMI capture, screen share): the crop mode applies once, to the combined split group, and the slices are cut from the cropped area. A repeat screen is cropped by itself.
- **Stills** (PDF, images, the sample deck, the test pattern) on the split group are never cropped: the group shows the whole slide sliced across its screens. So a slide for a split group should be exported at the combined aspect ratio.
- With **two or more screens**, a repeat screen crops a still to its own shape using the current crop mode, just as it would a video, so it is never stretched. For example, the 32:9 test pattern on a 16:9 side screen shows its middle half. **Fill 1-to-1** still stretches. A **single screen** shows the whole slide, as above.
- The **test pattern** is drawn at the split group's combined size, so its grid and circles are not distorted across the slices.

All screens share one texture. Each screen only changes which part of it its panel's UVs point at, so extra screens cost almost nothing extra to render. The maths is in [`src/utils/screenLayout.ts`](../src/utils/screenLayout.ts).

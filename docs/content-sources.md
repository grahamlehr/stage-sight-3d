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

PDF, image and sample-deck slides are mapped onto the whole screen with no cropping or letterboxing. **A slide with a different aspect ratio from the screen will look stretched.** To preview a 32:9 wall, export the deck at 32:9 (for example 5760 × 1620 or 7680 × 2160). Then the preview matches what the wall will show.

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

# Custom venues

The **Venue** tab can swap the procedural ballroom for your own model of the room. This page covers how to prepare the model and how to bind the screen to it.

## Preparing the model

| Requirement | Why |
| --- | --- |
| **Prefer `.glb`.** A `.gltf` must be self-contained, with buffers and textures embedded as data URIs. | The file is loaded from a single `blob:` URL, so a `.gltf` that points to separate `.bin` or image files can't find them. |
| **Author in meters.** | The model is loaded at its native scale with no conversion. A centimeter model looks 100× too large, and its screen and D/H values are wrong by the same factor. |
| **Y up, floor at `y = 0`.** | Seats are always placed at `y = 0`, with the eye 1.2m above. |
| **Audience toward +Z, screen wall facing +Z.** | The screen always faces +Z, and the off-axis angle is measured against that direction. A model facing another way can be turned after loading; see [Turning the venue](#turning-the-venue). |
| **Stage near the origin, screen around `z = −12`,** if you want the seat presets to land in sensible places. | The presets use fixed coordinates taken from the demo ballroom. |
| **Keep it light.** | The whole file stays in memory while it's loaded. Every mesh casts and receives shadows, so high poly counts hit the frame rate directly, especially in VR. |

Most DCC tools, including Blender, SketchUp and Revit through an exporter, can export glTF in meters with Y up. Blender's glTF exporter converts from Z-up for you.

## Loading it

1. Open the **Venue** tab and choose **Upload .GLB**.
2. The model replaces the ballroom. If it fails to parse, an alert appears and the app falls back to the ballroom.

Uploading another model releases the previous one from memory.

## Turning the venue

If the model's screen wall faces sideways or backwards, turn it in the **Rotation** row on the Venue tab: **0°**, **90°**, **180°** or **270°** about the vertical axis through the origin. Your seat turns with the room, so you stay in the same chair. A newly uploaded model starts at 0°.

Picking the screen mesh (below) chooses the rotation for you, so you usually won't need these buttons. If you turn the venue by hand after binding, pick the screen mesh again so the screen follows the wall.

## Binding the screen to a mesh

If your model contains the screen or LED wall as its own mesh, you can make the preview screen match it:

1. On the **Screen** tab, choose **Pick Screen Mesh from GLB**.
2. Click the screen mesh in the 3D view.

First, the venue is turned in quarter turns so the wall faces +Z:

- The wall's **facing axis** is its thinner horizontal extent. A wall that is thin in X faces ±X.
- The wall's **front** is the side you clicked it from, so pick it from the audience side. The model's own center isn't used, because backstage space behind the wall can be larger than the room in front of it.

Then the mesh's world-space bounding box, after the turn, sets the preview screen:

- **Width** is the box's X extent, rounded to 0.1m, minimum 1m.
- **Height** is the box's Y extent, rounded to 0.1m, minimum 1m.
- **Position** is the center of the box's front face, plus 2cm towards the audience so the preview doesn't flicker against the wall.

Binding also finds the stage, so the presenter, lectern and panel stand on it instead of floating at the demo ballroom's 1m deck height. A ray is cast straight down from 1m in front of the wall, at the wall's centre height, and the first surface it hits sets **Stage Floor Height**. If it hits nothing, the props go on the floor at `y = 0`.

**Stage Floor Height** sits at the top of **Stage Occlusion Items** on the Screen tab, for custom venues only. Use it if the stage in front of your wall isn't level, or if the ray hit something else first, such as a lectern in the model. A newly uploaded model starts at 0m.

The picked mesh's name appears next to the button.

**Binding copies size and position, and snaps the facing to a quarter turn.** The preview screen is still a flat plane facing +Z. A wall that is curved or angled off the X and Z axes is approximated, not reproduced, and its telemetry is graded as if it faced the nearest axis.

Picking only works on a custom venue. Clicks on the demo ballroom don't bind.

## Moving around

Click-to-sit works on any part of the model: in seated view, click; in orbit view, <kbd>Shift</kbd> + click. The seat goes at the clicked X and Z, always at floor height `y = 0`. Clicking a balcony or a raked tier puts you on the main floor below it.

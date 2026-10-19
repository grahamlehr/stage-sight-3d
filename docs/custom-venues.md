# Custom venues

The **Venue** tab can swap the procedural ballroom for your own model of the room. This page covers how to prepare the model and how to bind the screen to it.

## Preparing the model

| Requirement | Why |
| --- | --- |
| **Prefer `.glb`.** A `.gltf` must be self-contained, with buffers and textures embedded as data URIs. | The file is loaded from a single `blob:` URL, so a `.gltf` that points to separate `.bin` or image files can't find them. |
| **Author in meters.** | The model is loaded at its native scale with no conversion. A centimeter model looks 100× too large, and its screen and D/H values are wrong by the same factor. |
| **Y up, floor at `y = 0`.** | Seats are always placed at `y = 0`, with the eye 1.2m above. |
| **Audience toward +Z, screen wall facing +Z.** | The screen always faces +Z, and the off-axis angle is measured against that direction. |
| **Stage near the origin, screen around `z = −12`,** if you want the seat presets to land in sensible places. | The presets use fixed coordinates taken from the demo ballroom. |
| **Keep it light.** | The whole file stays in memory while it's loaded. Every mesh casts and receives shadows, so high poly counts hit the frame rate directly, especially in VR. |

Most DCC tools, including Blender, SketchUp and Revit through an exporter, can export glTF in meters with Y up. Blender's glTF exporter converts from Z-up for you.

## Loading it

1. Open the **Venue** tab and choose **Upload .GLB**.
2. The model replaces the ballroom. If it fails to parse, an alert appears and the app falls back to the ballroom.

Uploading another model releases the previous one from memory.

## Binding the screen to a mesh

If your model contains the screen or LED wall as its own mesh, you can make the preview screen match it:

1. On the **Screen** tab, choose **Pick Screen Mesh from GLB**.
2. Click the screen mesh in the 3D view.

The mesh's world-space bounding box sets the preview screen:

- **Width** is the larger of the box's X and Z extents, rounded to 0.1m, minimum 1m.
- **Height** is the box's Y extent, rounded to 0.1m, minimum 1m.
- **Position** is the box's center.

The picked mesh's name appears next to the button.

**Binding copies size and position only.** The preview screen is still a flat plane facing +Z, drawn at the mesh's center. A wall that is curved, angled or faces another direction is approximated, not reproduced, and its telemetry is graded as if it faced +Z.

Picking only works on a custom venue. Clicks on the demo ballroom don't bind.

## Moving around

Click-to-sit works on any part of the model: in seated view, click; in orbit view, <kbd>Shift</kbd> + click. The seat goes at the clicked X and Z, always at floor height `y = 0`. Clicking a balcony or a raked tier puts you on the main floor below it.

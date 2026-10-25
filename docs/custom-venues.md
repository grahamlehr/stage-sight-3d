# Custom venues

The **Venue** tab can swap the procedural ballroom for your own model of the room. This page covers how to prepare the model and how to bind screens to it.

## Preparing the model

| Requirement | Why |
| --- | --- |
| **Prefer `.glb`.** A `.gltf` must be self-contained, with buffers and textures embedded as data URIs. | The file is loaded from a single `blob:` URL, so a `.gltf` that points to separate `.bin` or image files can't find them. |
| **Author in meters.** | The model is loaded at its native scale with no conversion. A centimeter model looks 100× too large, and its screen and D/H values are wrong by the same factor. |
| **Y up, floor at `y = 0`.** | Click-to-sit places the seat at `y = 0`, with the eye 1.2m above. Camera views placed on the floor plan use the height of the floor you click, so any floor height works there. |
| **Audience toward +Z, screen wall facing +Z.** | The screen always faces +Z, and the off-axis angle is measured against that direction. A model facing another way can be turned after loading; see [Turning the venue](#turning-the-venue). |
| **Nothing special about where it sits.** | Keys 1–4 don't use the ballroom's fixed seats in a custom venue. You place four camera views yourself on the [floor plan](#camera-views-and-the-floor-plan). |
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

1. On the **Screen** tab, choose **Pick screen mesh**.
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

The picked mesh's name appears as a tag on that screen in the list.

### Adding several screens

After the first pick the button reads **Add screen from mesh**. Each further pick adds another screen over the mesh you click, in the **Repeat** role. **Shift-click** a mesh to keep picking mode on and add several in a row; a plain click adds one and switches picking off. These later picks don't turn the venue again, because only the first pick aligns the room.

Clicking a mesh that is already bound selects its screen instead of adding a duplicate. Use the screen list to rename, reorder, set the primary screen or remove screens. See [Several screens](content-sources.md#several-screens-repeat-and-split) for repeat and split.

### Angled screens

Each picked screen is a flat plane laid over the mesh. It takes the mesh's size and centre, and its **facing comes from the mesh's surface**, so a wing screen set at an angle to the main wall is turned to match (only the yaw, about the vertical axis). The first pick also snaps the venue to a quarter turn; any angle left over beyond that stays on the screen as its own yaw, and the telemetry uses it.

**A curved wall, or one pitched or rolled, is still approximated** by a flat vertical plane.

Picking only works on a custom venue. Clicks on the demo ballroom don't bind. (The demo ballroom has a **Side screens** toggle on the Screen tab that adds two angled screens for trying out repeat and split.)

## Camera views and the floor plan

In a custom venue, keys <kbd>1</kbd>–<kbd>4</kbd>, the **Seat Presets** menu and the VR thumbstick all jump between four camera views that you place yourself. Until you place one it shows as **Not placed yet** and is skipped. In the ballroom they keep their fixed seats.

1. On the **Venue** tab, under **Camera Views**, choose **Open Floor Plan**. The 3D view is replaced by a top-down plan with the screen wall at the top. The mouse wheel zooms.
2. Set the **Cut height** slider so the plan slices through the model below its roof and upper floors. It starts 2.5m above the model's lowest point, and the slider shows metres above that point.
3. Pick a slot (**View 1** to **View 4**), then **click a floor spot** to place it. **Drag** from that spot to point the view; release to confirm. A plain click without a drag aims the view at the screen centre. The next empty slot is selected for you.
4. Close the plan with **Close Floor Plan** or <kbd>Esc</kbd>. The × beside a slot clears it.

Things to know:

- **Placed views keep the clicked floor height,** so raked tiers and balconies work. The click lands on the first surface at or below the cut height, so cut below a balcony's ceiling to place a view on the floor underneath, or above it to place one on top.
- **A placed view's heading is kept.** The seated camera faces the way you pointed it, and the eye is 1.2m above the clicked floor.
- **Views reset when you upload a different model,** and the plan closes. Reloading the same file keeps them. Turning the venue with the **Rotation** buttons carries the views round with the room.
- The floor plan isn't available in VR; entering a headset closes it. Views still work as VR seats, but the headset keeps its own heading (the first calibration faces the screen).
- While the plan is open, picking and click-to-sit are paused, and telemetry isn't graded.

## Moving around

Click-to-sit works on any part of the model: in seated view, click; in orbit view, <kbd>Shift</kbd> + click. The seat goes at the clicked X and Z, always at floor height `y = 0`, and looks at the screen centre. Clicking a balcony or a raked tier puts you on the main floor below it; use a floor plan view for those.

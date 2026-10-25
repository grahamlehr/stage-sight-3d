# Sightline telemetry

StageSight 3D grades the current viewpoint against two sightline checks based on AVIXA's DISCAS (Display Image Size for 2D Content in Audiovisual Systems) standard: **distance-to-height ratio** and **horizontal off-axis angle**. This page covers how they're computed, what the bands mean, and what the numbers leave out.

The implementation is [`src/utils/discasMath.ts`](../src/utils/discasMath.ts). Its tests, [`discasMath.test.ts`](../src/utils/discasMath.test.ts), are the source of truth for edge cases.

## Inputs

| Input | Source |
| --- | --- |
| Eye position | The camera's world position: the orbit camera, the seated eye 1.2m above the seat, or the VR headset |
| Screen position | The primary screen's center |
| Screen rotation | Only the Y (yaw) component of the primary screen's rotation is used |
| Screen height | The primary screen's height, in meters |

With several screens, the headline numbers (and the formulas below) are for the **primary screen**, marked with a star on the Screen tab. Pick a different one there to read from it instead.

**Worst flag.** The same calculation runs for every other screen. If one lands in a strictly worse band than the primary from the current seat (D/H or angle), the HUD shows a line such as *Worst: Left screen · Marginal*, with whichever of that screen's two bands is worse. The VR HUD shows the same line. The flag names the screen but doesn't change the headline numbers. It is absent when the primary is already the worst or every screen reads the same.

`CameraController` recomputes telemetry at most every 50ms (20 Hz).

## Viewing distance and D/H ratio

```
viewingDistance = max(0.1, |eye − screenCenter|)        3D Euclidean, meters
dhRatio         = viewingDistance / max(0.1, screenHeight)
```

The distance is the full 3D distance to the screen center. It includes the height difference, so a seated eye looking up at a raised screen is farther away than the floor distance suggests.

| Status | Band | HUD label |
| --- | --- | --- |
| `detail` | D/H < 4.0 | High Acuity / Analytical Detail |
| `reading` | 4.0 ≤ D/H ≤ 6.0 | Optimal Basic Reading |
| `marginal` | 6.0 < D/H ≤ 8.0 | Marginal — Small Text Risk |
| `fail` | D/H > 8.0 | Exceeds DISCAS Max Distance |

## Horizontal off-axis angle

The screen faces +Z, rotated by its yaw `ry`, so its normal in the horizontal plane is `(sin ry, cos ry)`. The angle is the one between that normal and the horizontal direction from the screen center to the eye:

```
offAxisAngle = acos( normal · normalize(eye.xz − screen.xz) )      degrees, 0–180
```

Height is ignored. If the eye is directly above or below the screen center (horizontal distance under 1mm), the angle is 0.

| Status | Band | HUD label |
| --- | --- | --- |
| `optimal` | angle < 30° | On-Axis |
| `steep` | 30° ≤ angle ≤ 45° | Steep Angle |
| `extreme` | angle > 45° | Extreme Off-Axis |

## Rounding

Results are rounded before they're stored: distance to 0.1m, D/H to two decimals and the angle to 0.1°. Statuses are decided on the unrounded values.

## Seat presets

These are the values the presets produce with the default 16m × 4.5m screen centered at `[0, 3.4, -12]`. The 1.2m eye height is included.

| Key | Preset | Seat (x, z) | Distance | D/H | Off-axis |
| --- | --- | --- | --- | --- | --- |
| <kbd>1</kbd> | Front Row Center | (0, −8) | 4.6m | 1.01 · detail | 0° · optimal |
| <kbd>2</kbd> | Front Row Far Left | (−6.5, −8) | 7.9m | 1.77 · detail | 58.4° · extreme |
| <kbd>3</kbd> | Mid House Center | (0, 2) | 14.2m | 3.15 · detail | 0° · optimal |
| <kbd>4</kbd> | Back of Room | (0, 13) | 25.1m | 5.58 · reading | 0° · optimal |

> [!NOTE]
> The app labels preset 2 "~48° Off-Axis", but from (−6.5, −8) the angle to the screen center is 58.4°. Either the label or the seat position needs to change.

## What the numbers don't cover

Keep these in mind when you read a result as pass or fail:

- **Everything is measured to the screen center.** On an ultra-wide screen, the near and far edges sit at very different angles and distances. From Mid House Center, the edge of a 16m-wide screen is about 30° off the line of sight, even though the center reads 0°. Check edge content from the seat as well as reading the numbers.
- **Vertical angle isn't graded.** A screen hung high above the front rows shows only as extra distance, not as a neck-strain warning.
- **D/H uses the whole screen height.** DISCAS sizes by the height of the content image. If letterboxed or cropped content fills only part of the screen, the effective ratio is worse than shown.
- **Only yaw is considered.** A screen that's pitched or rolled is graded as if it were vertical. Screens picked from angled meshes get their yaw from the mesh, but there is no rotation control for the others (see [Architecture: known gaps](architecture.md#known-gaps)).
- **Occlusion isn't scored.** The presenter, lectern and panel props are for checking by eye. They don't affect the telemetry.

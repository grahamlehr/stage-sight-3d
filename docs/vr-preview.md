# VR preview

VR lets you sit in a seat at real scale with a WebXR headset and read the screen the way the audience will. The workflow is built and tested around a Meta Quest tethered to a PC (PCVR).

## Requirements

- **A browser that supports WebXR `immersive-vr`,** such as desktop Chrome or Edge, with an active OpenXR runtime.
- **A secure context.** The deployed HTTPS app works, and so does `http://localhost:5173` on the PC running the dev server. A plain-HTTP LAN address won't expose WebXR.
- **A headset connected as the OpenXR runtime.** For a Quest, that's one of:
  - **Quest Link** (cable) or **Air Link** (Wi-Fi), with Meta set as the active OpenXR runtime in the Meta Quest Link PC app.
  - **Virtual Desktop** with its **VDXR** runtime.

## Entering VR

1. Connect the headset and open the app in the desktop browser.
2. The top HUD button changes from **VR Preview** to **Enter VR** once the browser reports `immersive-vr` support. The app checks again when a device connects, so you can link the headset after the page has loaded.
3. Choose **Enter VR**.

If the button still says **VR Preview**, selecting it opens a setup panel instead. That means the browser doesn't see a runtime yet.

When the session starts, the app switches to seated mode and reads the first valid head pose. It then sets your current facing direction as "toward the stage" and places your eye 1.2m above the current seat. Press **B / Y** (or <kbd>R</kbd> on the keyboard) at any time to set those again.

## Controls

| Input | Action |
| --- | --- |
| Trigger, pointing at the floor | Teleport to that seat. A reticle shows where you'll land. |
| A / X | Next seat preset |
| B / Y | Recenter the view and reset seated eye height |
| Grip | Cycle the lighting preset |
| Thumbstick left / right | Previous / next slide when a multi-slide deck is loaded; otherwise previous / next seat preset |
| Thumbstick click | Show / hide the in-headset telemetry HUD |

The desktop keyboard keeps working during a session: <kbd>1</kbd>–<kbd>4</kbd>, <kbd>R</kbd>, <kbd>L</kbd> and <kbd>H</kbd>.

## How seated calibration behaves

- **Leaning, standing up and looking up are left alone.** The view isn't snapped back to 1.2m while you move.
- **A floor guard stops you sinking.** If your eye would drop below 0.6m above the seat, it is put back at seated height.
- **Changing seats resets only the eye height.** Your forward direction stays the same.
- **The telemetry HUD is fixed to the seat,** at seated eye height, not to your head.

## Troubleshooting

| Symptom | Try |
| --- | --- |
| The button never becomes **Enter VR** | Make sure Link, Air Link or VDXR is connected *and* set as the active OpenXR runtime, then reload the page. Confirm you're on HTTPS or `localhost`. |
| "Could not start Meta Quest VR session" alert | The runtime refused the session. Restart Link or Virtual Desktop, then try again. |
| The world is rotated or you're facing the back wall | Face where you want the stage to be and press **B / Y**. |
| The view is too high or too low | Sit at your normal seated height and press **B / Y**. |
| Low frame rate | Use the demo ballroom or a lighter custom model. Every venue mesh casts shadows. |

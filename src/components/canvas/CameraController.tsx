import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import { useStageStore, getActiveSeatPresets, selectPrimaryScreen } from '../../store/useStageStore';
import { computeDiscasTelemetry, worstScreenTelemetry } from '../../utils/discasMath';
import { rotateAboutY } from '../../utils/venueAlignment';
import { seatedLookTarget } from '../../utils/floorPlan';
import { directionFromYawPitch, SEATED_EYE_HEIGHT, yawPitchFromDirection } from '../../utils/storyboard';

export const CameraController: React.FC = () => {
  const gl = useThree((s) => s.gl);
  // The floor plan swaps in an orthographic default camera. Everything here
  // keeps driving the perspective camera the scene started with: drei's
  // OrbitControls would otherwise be rebuilt around the other camera and lose
  // its target, and the seat effects would move the plan camera.
  const defaultCamera = useThree((s) => s.camera);
  const [camera] = useState(defaultCamera);
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const worldPosRef = useRef(new THREE.Vector3());

  const navigationMode = useStageStore((s) => s.navigationMode);
  const seatPosition = useStageStore((s) => s.seatPosition);
  const seatYaw = useStageStore((s) => s.seatYaw);
  const seatPitch = useStageStore((s) => s.seatPitch);
  const isFloorPlanOpen = useStageStore((s) => s.isFloorPlanOpen);
  const fovMode = useStageStore((s) => s.fovMode);
  const screenPosition = useStageStore((s) => selectPrimaryScreen(s).position);
  const setTelemetry = useStageStore((s) => s.setTelemetry);
  const isVrPresenting = useStageStore((s) => s.isVrPresenting);

  // Seated look-around yaw/pitch angles
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const seatedYawPitchRef = useRef({ yaw: 0, pitch: 0 });

  // 1. Dual-FOV Optical Toggle (50° Room Context vs 25° Eye Focus) — only when not in WebXR
  useEffect(() => {
    if (isVrPresenting) return;
    const targetFov = fovMode === 'room-context' ? 50 : 25;
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const persCamera = camera as THREE.PerspectiveCamera;
      persCamera.fov = targetFov;
      persCamera.updateProjectionMatrix();
    }
  }, [fovMode, camera, isVrPresenting]);

  // 2. Seated Mode Position & Aiming (Flat desktop mode)
  useEffect(() => {
    // A gizmo drag updates screenPosition on every move. Leave the camera alone
    // then: re-aiming would swing the seated view under the cursor, and
    // re-enabling orbit would undo drei disabling it for the drag. Read from the
    // store rather than subscribed, so releasing the gizmo doesn't snap the view.
    if (useStageStore.getState().isTransformDragging) return;

    if (isVrPresenting) {
      if (orbitRef.current) {
        orbitRef.current.enabled = false;
      }
      return;
    }

    if (navigationMode === 'seated') {
      const [sx, sy, sz] = seatPosition;
      const eyeHeight = SEATED_EYE_HEIGHT; // 1.2m seated eye level
      const eyePos = new THREE.Vector3(sx, sy + eyeHeight, sz);
      camera.position.copy(eyePos);

      // Point the camera at the centre of the screen, or along the heading of a
      // custom view placed on the floor plan
      if (seatYaw !== null && seatPitch !== null) {
        // A full camera view: look exactly along its saved heading and pitch
        const [dx, dy, dz] = directionFromYawPitch(seatYaw, seatPitch);
        camera.lookAt(eyePos.x + dx, eyePos.y + dy, eyePos.z + dz);
        seatedYawPitchRef.current.yaw = seatYaw;
        seatedYawPitchRef.current.pitch = seatPitch;
      } else {
        const lookTarget = new THREE.Vector3(
          ...(seatYaw === null
            ? screenPosition
            : seatedLookTarget(eyePos.toArray(), seatYaw, screenPosition))
        );
        camera.lookAt(lookTarget);

        // Compute initial yaw and pitch relative to that target
        const forward = new THREE.Vector3().subVectors(lookTarget, eyePos).normalize();
        seatedYawPitchRef.current.yaw = Math.atan2(forward.x, forward.z);
        seatedYawPitchRef.current.pitch = Math.asin(forward.y);
      }

      if (orbitRef.current) {
        orbitRef.current.enabled = false;
      }
    } else {
      if (orbitRef.current) {
        // The floor plan has its own fixed top-down view
        orbitRef.current.enabled = !useStageStore.getState().isFloorPlanOpen;
      }
    }
  }, [navigationMode, seatPosition, seatYaw, seatPitch, screenPosition, camera, isVrPresenting, isFloorPlanOpen]);

  // 2c. Let the storyboard read where the camera is now (for "Update from
  // camera", extra shots and "Capture this view"). Like toggleVrSession, it is
  // registered while mounted and cleared on the way out.
  useEffect(() => {
    const pose = () => {
      const persCamera = camera as THREE.PerspectiveCamera;
      const eye = new THREE.Vector3();
      const dir = new THREE.Vector3();
      persCamera.updateMatrixWorld();
      persCamera.getWorldPosition(eye);
      persCamera.getWorldDirection(dir);
      const { yaw, pitch } = yawPitchFromDirection([dir.x, dir.y, dir.z]);
      return { eye: [eye.x, eye.y, eye.z] as [number, number, number], yaw, pitch, fov: persCamera.fov };
    };
    useStageStore.getState().setGetLiveCameraPose(pose);
    return () => useStageStore.getState().setGetLiveCameraPose(null);
  }, [camera]);

  // 2a. The perspective camera isn't resized while the plan camera is the
  // default, so refresh its aspect ratio when the plan closes.
  useEffect(() => {
    if (isFloorPlanOpen) return;
    const persCamera = camera as THREE.PerspectiveCamera;
    if (persCamera.isPerspectiveCamera && gl.domElement.clientHeight > 0) {
      persCamera.aspect = gl.domElement.clientWidth / gl.domElement.clientHeight;
      persCamera.updateProjectionMatrix();
    }
  }, [isFloorPlanOpen, camera, gl]);

  // 2b. Turn the orbit camera with the venue. Picking a screen mesh turns a
  // custom venue about the world origin; without this the room spins under a
  // still camera, which reads as the camera jumping somewhere else. Seated
  // views are covered by effect 2, because setVenueYaw carries the seat round.
  useEffect(() => {
    return useStageStore.subscribe((state, prev) => {
      if (state.venueYaw === prev.venueYaw || state.isVrPresenting || state.navigationMode !== 'orbit') return;
      const delta = state.venueYaw - prev.venueYaw;
      camera.position.fromArray(rotateAboutY(camera.position.toArray(), delta));
      const controls = orbitRef.current;
      if (controls) {
        controls.target.fromArray(rotateAboutY(controls.target.toArray(), delta));
        controls.update();
      }
    });
  }, [camera]);

  // 3. Pointer drag look-around when seated (Flat desktop mode)
  useEffect(() => {
    if (navigationMode !== 'seated' || isVrPresenting || isFloorPlanOpen) return;

    const domElement = gl.domElement;

    const handlePointerDown = (e: PointerEvent) => {
      // Primary button drag for look-around
      if (e.button === 0) {
        isDraggingRef.current = true;
        prevPointerRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      // The same press that grabbed a gizmo handle also lands here; let the
      // gizmo have it. Checked on move because the gizmo's own pointerdown
      // listener may run after ours.
      if (useStageStore.getState().isTransformDragging) {
        prevPointerRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const deltaX = e.clientX - prevPointerRef.current.x;
      const deltaY = e.clientY - prevPointerRef.current.y;
      prevPointerRef.current = { x: e.clientX, y: e.clientY };

      const sensitivity = 0.003;
      seatedYawPitchRef.current.yaw -= deltaX * sensitivity;
      seatedYawPitchRef.current.pitch = Math.max(
        -Math.PI / 2.5,
        Math.min(Math.PI / 2.5, seatedYawPitchRef.current.pitch - deltaY * sensitivity)
      );

      // Apply look orientation from stationary seat
      const [sx, sy, sz] = seatPosition;
      const eyePos = new THREE.Vector3(sx, sy + 1.2, sz);
      camera.position.copy(eyePos);

      const targetX = eyePos.x + Math.sin(seatedYawPitchRef.current.yaw) * Math.cos(seatedYawPitchRef.current.pitch);
      const targetY = eyePos.y + Math.sin(seatedYawPitchRef.current.pitch);
      const targetZ = eyePos.z + Math.cos(seatedYawPitchRef.current.yaw) * Math.cos(seatedYawPitchRef.current.pitch);

      camera.lookAt(targetX, targetY, targetZ);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [navigationMode, seatPosition, camera, gl, isVrPresenting, isFloorPlanOpen]);

  // 4. Desk/PCVR Hotkeys: 1-4 Seat Presets, Esc close floor plan, R Recenter VR, L Cycle Lighting, H Toggle VR HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const state = useStageStore.getState();
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key, 10) - 1;
        // Unplaced custom views can't be applied
        const preset = getActiveSeatPresets(state)[idx];
        if (preset?.placed) {
          state.applySeatPreset(preset.id);
        }
      } else if (e.key === 'Escape') {
        if (state.isFloorPlanOpen) state.setIsFloorPlanOpen(false);
      } else if (e.key === 'r' || e.key === 'R') {
        state.triggerVrRecenter();
      } else if (e.key === 'l' || e.key === 'L') {
        state.cycleLightingPreset();
      } else if (e.key === 'h' || e.key === 'H') {
        state.setVrHudVisible(!state.vrHudVisible);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 5. Live DISCAS Telemetry Calculation on frame (throttled, using world eye position)
  const lastTelemetryUpdate = useRef(0);
  useFrame(({ clock }) => {
    // The plan camera isn't an eye, so there's nothing to grade
    if (useStageStore.getState().isFloorPlanOpen) return;
    const elapsed = clock.getElapsedTime();
    if (elapsed - lastTelemetryUpdate.current > 0.05) {
      lastTelemetryUpdate.current = elapsed;

      camera.getWorldPosition(worldPosRef.current);
      const camPos: [number, number, number] = [
        worldPosRef.current.x,
        worldPosRef.current.y,
        worldPosRef.current.z,
      ];

      const { screens, primaryScreenId } = useStageStore.getState();
      const results = screens.map((screen) => ({
        id: screen.id,
        name: screen.name,
        telemetry: computeDiscasTelemetry({
          cameraPos: camPos,
          screenPos: screen.position,
          screenRotation: screen.rotation,
          screenHeight: screen.height,
        }),
      }));
      const primary = results.find((r) => r.id === primaryScreenId) ?? results[0];
      setTelemetry({ ...primary.telemetry, worst: worstScreenTelemetry(primary.id, results) });
    }
  });

  return (
    <>
      <OrbitControls
        ref={orbitRef}
        makeDefault
        camera={camera}
        enabled={!isVrPresenting && navigationMode === 'orbit' && !isFloorPlanOpen}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={Math.PI / 2 - 0.02} // Do not dip below venue floor
        minDistance={2}
        maxDistance={50}
        target={navigationMode === 'orbit' ? [0, 2, -5] : undefined}
      />
    </>
  );
};

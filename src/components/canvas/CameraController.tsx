import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { OrbitControls } from '@react-three/drei';
import { useStageStore, SEAT_PRESETS } from '../../store/useStageStore';
import { computeDiscasTelemetry } from '../../utils/discasMath';

export const CameraController: React.FC = () => {
  const { camera, gl } = useThree();
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const worldPosRef = useRef(new THREE.Vector3());

  const navigationMode = useStageStore((s) => s.navigationMode);
  const seatPosition = useStageStore((s) => s.seatPosition);
  const fovMode = useStageStore((s) => s.fovMode);
  const screenPosition = useStageStore((s) => s.screenPosition);
  const screenRotation = useStageStore((s) => s.screenRotation);
  const screenHeight = useStageStore((s) => s.screenHeight);
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
    if (isVrPresenting) {
      if (orbitRef.current) {
        orbitRef.current.enabled = false;
      }
      return;
    }

    if (navigationMode === 'seated') {
      const [sx, sy, sz] = seatPosition;
      const eyeHeight = 1.2; // 1.2m seated eye level
      const eyePos = new THREE.Vector3(sx, sy + eyeHeight, sz);
      camera.position.copy(eyePos);

      // Point camera at center of screen
      const screenTarget = new THREE.Vector3(...screenPosition);
      camera.lookAt(screenTarget);

      // Compute initial yaw and pitch relative to screen target
      const forward = new THREE.Vector3().subVectors(screenTarget, eyePos).normalize();
      seatedYawPitchRef.current.yaw = Math.atan2(forward.x, forward.z);
      seatedYawPitchRef.current.pitch = Math.asin(forward.y);

      if (orbitRef.current) {
        orbitRef.current.enabled = false;
      }
    } else {
      if (orbitRef.current) {
        orbitRef.current.enabled = true;
      }
    }
  }, [navigationMode, seatPosition, screenPosition, camera, isVrPresenting]);

  // 3. Pointer drag look-around when seated (Flat desktop mode)
  useEffect(() => {
    if (navigationMode !== 'seated' || isVrPresenting) return;

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
  }, [navigationMode, seatPosition, camera, gl, isVrPresenting]);

  // 4. Desk/PCVR Hotkeys: 1-4 Seat Presets, R Recenter VR, L Cycle Lighting, H Toggle VR HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const state = useStageStore.getState();
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key, 10) - 1;
        if (SEAT_PRESETS[idx]) {
          state.applySeatPreset(SEAT_PRESETS[idx].id);
        }
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
    const elapsed = clock.getElapsedTime();
    if (elapsed - lastTelemetryUpdate.current > 0.05) {
      lastTelemetryUpdate.current = elapsed;

      camera.getWorldPosition(worldPosRef.current);
      const camPos: [number, number, number] = [
        worldPosRef.current.x,
        worldPosRef.current.y,
        worldPosRef.current.z,
      ];

      const tel = computeDiscasTelemetry({
        cameraPos: camPos,
        screenPos: screenPosition,
        screenRotation,
        screenHeight,
      });

      setTelemetry(tel);
    }
  });

  return (
    <>
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enabled={!isVrPresenting && navigationMode === 'orbit'}
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

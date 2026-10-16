import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useStageStore, SEAT_PRESETS } from '../../store/useStageStore';

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export const VrControllerRig: React.FC = () => {
  const { gl, camera, scene } = useThree();

  const seatPosition = useStageStore((s) => s.seatPosition);
  const telemetry = useStageStore((s) => s.telemetry);
  const sourceType = useStageStore((s) => s.sourceType);
  const slides = useStageStore((s) => s.slides);
  const currentSlideIndex = useStageStore((s) => s.currentSlideIndex);
  const screenWidth = useStageStore((s) => s.screenWidth);
  const screenHeight = useStageStore((s) => s.screenHeight);
  const lightingPreset = useStageStore((s) => s.lightingPreset);
  const venueWidth = useStageStore((s) => s.venueWidth);
  const venueLength = useStageStore((s) => s.venueLength);
  const isVrPresenting = useStageStore((s) => s.isVrPresenting);
  const vrHudVisible = useStageStore((s) => s.vrHudVisible);
  const vrRecenterCount = useStageStore((s) => s.vrRecenterCount);

  const setIsVrSupported = useStageStore((s) => s.setIsVrSupported);
  const setIsVrPresenting = useStageStore((s) => s.setIsVrPresenting);
  const setToggleVrSession = useStageStore((s) => s.setToggleVrSession);
  const setNavigationMode = useStageStore((s) => s.setNavigationMode);
  const setSeatPosition = useStageStore((s) => s.setSeatPosition);

  const rigGroupRef = useRef<THREE.Group>(null);
  const hudAnchorGroupRef = useRef<THREE.Group>(null);
  const reticleRef = useRef<THREE.Mesh>(null);
  const needsInitialRecenterRef = useRef(false);
  const sessionStartFramesRef = useRef(0);

  // Latest raw headset pose in the WebXR reference space
  const latestRawPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const latestRawQuatRef = useRef(new THREE.Quaternion());
  const hasValidPoseRef = useRef(false);

  // Calibrated head offset in rig space so neutral seated head pose maps to [sx, sy + 1.2, sz] facing -Z
  const calibratedYawRef = useRef(0);
  const calibratedOffsetRef = useRef(new THREE.Vector3(0, 0, 0));

  // Track last hovered floor point from either controller
  const hoveredFloorPointRef = useRef<THREE.Vector3 | null>(null);
  const [hasControllers, setHasControllers] = useState(false);

  // Debounce state for VR controller gamepad buttons & thumbsticks
  const prevButtonStatesRef = useRef<Record<string, boolean>>({});
  const prevStickStatesRef = useRef<Record<string, boolean>>({});

  const SEATED_EYE_HEIGHT = 1.2; // Standard 1.20m sitting eye height

  // Helper to apply seat position + calibration offset to rigGroup and HUD anchor
  const syncRigTransform = () => {
    const rig = rigGroupRef.current;
    const [sx, sy, sz] = useStageStore.getState().seatPosition;
    const offset = calibratedOffsetRef.current;

    if (rig) {
      rig.rotation.set(0, calibratedYawRef.current, 0);
      rig.position.set(
        sx - offset.x,
        sy + SEATED_EYE_HEIGHT - offset.y,
        sz - offset.z
      );
      rig.updateMatrixWorld(true);
    }

    if (hudAnchorGroupRef.current) {
      hudAnchorGroupRef.current.position.set(sx, sy + SEATED_EYE_HEIGHT, sz);
      hudAnchorGroupRef.current.rotation.set(0, 0, 0);
      hudAnchorGroupRef.current.updateMatrixWorld(true);
    }
  };

  // Recenter calibration using raw WebXR headset pose: aligns current headset yaw to ballroom -Z and resets height to 1.2m sitting eye level
  const calibrateHeadPose = () => {
    if (!hasValidPoseRef.current) {
      calibratedYawRef.current = 0;
      calibratedOffsetRef.current.set(0, 0, 0);
      syncRigTransform();
      return;
    }

    const euler = new THREE.Euler().setFromQuaternion(latestRawQuatRef.current, 'YXZ');
    const newYaw = -euler.y;
    calibratedYawRef.current = newYaw;

    const rotatedPos = latestRawPosRef.current
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), newYaw);
    calibratedOffsetRef.current.copy(rotatedPos);

    syncRigTransform();
  };

  // Reset only vertical eye height to 1.2m sitting height (used when switching seats or if height drifts)
  const resetVerticalSittingHeight = () => {
    if (hasValidPoseRef.current) {
      const rotatedPos = latestRawPosRef.current
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), calibratedYawRef.current);
      calibratedOffsetRef.current.y = rotatedPos.y;
    } else {
      calibratedOffsetRef.current.y = 0;
    }
    syncRigTransform();
  };

  // 1. Check WebXR 'immersive-vr' support & register session toggle action
  useEffect(() => {
    let mounted = true;

    const checkXrSupport = async () => {
      if (typeof navigator !== 'undefined' && 'xr' in navigator && navigator.xr) {
        try {
          const supported = await navigator.xr.isSessionSupported('immersive-vr');
          if (mounted) setIsVrSupported(supported);
        } catch {
          if (mounted) setIsVrSupported(false);
        }
      } else {
        if (mounted) setIsVrSupported(false);
      }
    };

    checkXrSupport();

    // Re-check if Quest Link / Virtual Desktop VDXR runtime is connected while page is open
    const xrNav = typeof navigator !== 'undefined' ? navigator.xr : undefined;
    xrNav?.addEventListener?.('devicechange', checkXrSupport);

    // Use 'local' reference space so Seated PCVR at a desk starts cleanly at (0,0,0)
    gl.xr.setReferenceSpaceType('local');

    const toggleVr = async () => {
      if (!navigator.xr) return;
      const currentSession = gl.xr.getSession();
      if (currentSession) {
        await currentSession.end();
        return;
      }

      try {
        const session = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
        });
        await gl.xr.setSession(session);
      } catch (err) {
        console.error('Failed to start WebXR immersive-vr session:', err);
        alert(
          'Could not start Meta Quest VR session. Make sure Virtual Desktop (VDXR) or Quest Link is connected and set as the active OpenXR runtime.'
        );
      }
    };

    setToggleVrSession(toggleVr);

    return () => {
      mounted = false;
      xrNav?.removeEventListener?.('devicechange', checkXrSupport);
      setToggleVrSession(null);
    };
  }, [gl, setIsVrSupported, setToggleVrSession]);

  // 2. Listen to WebXR sessionstart / sessionend and attach camera & controllers to rigGroup
  useEffect(() => {
    const rig = rigGroupRef.current;
    if (!rig) return;

    const controller0 = gl.xr.getController(0);
    const controller1 = gl.xr.getController(1);

    // Build sleek cyan laser pointer ray for each controller
    const createLaserRay = () => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -8),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.75,
      });
      const line = new THREE.Line(geo, mat);
      line.name = 'vr-laser-ray';
      return line;
    };

    const ray0 = createLaserRay();
    const ray1 = createLaserRay();
    controller0.add(ray0);
    controller1.add(ray1);

    rig.add(controller0);
    rig.add(controller1);

    const handleSelect = () => {
      if (hoveredFloorPointRef.current) {
        const pt = hoveredFloorPointRef.current;
        setSeatPosition([
          Math.round(pt.x * 10) / 10,
          0,
          Math.round(pt.z * 10) / 10,
        ]);
      }
    };

    const handleSqueeze = () => {
      useStageStore.getState().cycleLightingPreset();
    };

    const handleConnected = () => setHasControllers(true);

    controller0.addEventListener('select', handleSelect);
    controller1.addEventListener('select', handleSelect);
    controller0.addEventListener('squeeze', handleSqueeze);
    controller1.addEventListener('squeeze', handleSqueeze);
    controller0.addEventListener('connected', handleConnected);
    controller1.addEventListener('connected', handleConnected);

    const handleSessionStart = () => {
      setIsVrPresenting(true);
      setNavigationMode('seated');

      // Clear desktop Orbit/Seated camera local transform before parenting to VR rig
      // so leftover desktop Y height (e.g. 5m) never offsets the VR rig below the floor
      camera.position.set(0, 0, 0);
      camera.quaternion.identity();
      camera.updateMatrix();
      rig.add(camera);

      hasValidPoseRef.current = false;
      latestRawPosRef.current.set(0, 0, 0);
      latestRawQuatRef.current.identity();
      calibratedYawRef.current = 0;
      calibratedOffsetRef.current.set(0, 0, 0);
      syncRigTransform();

      needsInitialRecenterRef.current = true;
      sessionStartFramesRef.current = 0;
    };

    const handleSessionEnd = () => {
      setIsVrPresenting(false);
      hasValidPoseRef.current = false;
      scene.add(camera);
      camera.position.set(
        useStageStore.getState().seatPosition[0],
        useStageStore.getState().seatPosition[1] + SEATED_EYE_HEIGHT,
        useStageStore.getState().seatPosition[2]
      );
      camera.lookAt(...useStageStore.getState().screenPosition);
    };

    gl.xr.addEventListener('sessionstart', handleSessionStart);
    gl.xr.addEventListener('sessionend', handleSessionEnd);

    return () => {
      controller0.removeEventListener('select', handleSelect);
      controller1.removeEventListener('select', handleSelect);
      controller0.removeEventListener('squeeze', handleSqueeze);
      controller1.removeEventListener('squeeze', handleSqueeze);
      controller0.removeEventListener('connected', handleConnected);
      controller1.removeEventListener('connected', handleConnected);
      controller0.remove(ray0);
      controller1.remove(ray1);
      rig.remove(controller0);
      rig.remove(controller1);
      gl.xr.removeEventListener('sessionstart', handleSessionStart);
      gl.xr.removeEventListener('sessionend', handleSessionEnd);
    };
  }, [gl, camera, scene, setIsVrPresenting, setNavigationMode, setSeatPosition]);

  // 3. Update rig position and reset sitting height to 1.2m whenever seatPosition changes
  useEffect(() => {
    if (isVrPresenting) {
      resetVerticalSittingHeight();
    }
  }, [seatPosition, isVrPresenting]);

  // 4. Recenter VR view (and reset 1.2m sitting height) when vrRecenterCount increments
  useEffect(() => {
    if (isVrPresenting && vrRecenterCount > 0) {
      calibrateHeadPose();
    }
  }, [vrRecenterCount, isVrPresenting]);

  // 5. Build In-VR 3D Telemetry HUD Canvas & Texture
  const { hudCanvas, hudTexture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 300;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { hudCanvas: canvas, hudTexture: texture };
  }, []);

  // Redraw 3D VR Telemetry HUD whenever telemetry or scene state updates
  useEffect(() => {
    if (!isVrPresenting || !vrHudVisible) return;
    const ctx = hudCanvas.getContext('2d');
    if (!ctx) return;

    const W = hudCanvas.width;
    const H = hudCanvas.height;

    ctx.clearRect(0, 0, W, H);

    // Rounded translucent dark glass background
    ctx.fillStyle = 'rgba(9, 13, 22, 0.92)';
    ctx.beginPath();
    ctx.roundRect(8, 8, W - 16, H - 16, 24);
    ctx.fill();

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Top Header Bar
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('STAGESIGHT 3D // META QUEST VR SIGHTLINE HUD', 40, 48);

    // Matching Seat Preset Name or Custom Floor Coordinates
    const matchedPreset = SEAT_PRESETS.find(
      (p) =>
        Math.abs(p.position[0] - seatPosition[0]) < 0.25 &&
        Math.abs(p.position[2] - seatPosition[2]) < 0.25
    );
    const seatLabel = matchedPreset
      ? matchedPreset.name.toUpperCase()
      : `SEAT (${seatPosition[0].toFixed(1)}m, ${seatPosition[2].toFixed(1)}m)`;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(seatLabel, W - 40, 48);

    // Divider
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 66);
    ctx.lineTo(W - 40, 66);
    ctx.stroke();

    // 3 Metric Cards: Viewing Distance, D/H Ratio, Off-Axis Angle
    const dhColor =
      telemetry.dhStatus === 'detail' || telemetry.dhStatus === 'reading'
        ? '#10b981'
        : telemetry.dhStatus === 'marginal'
        ? '#f59e0b'
        : '#f43f5e';

    const angleColor =
      telemetry.angleStatus === 'optimal'
        ? '#10b981'
        : telemetry.angleStatus === 'steep'
        ? '#f59e0b'
        : '#f43f5e';

    const cards = [
      {
        label: 'VIEWING DISTANCE (D)',
        value: `${telemetry.viewingDistance}m`,
        sub: `Screen: ${screenWidth}m × ${screenHeight}m`,
        accent: '#38bdf8',
      },
      {
        label: 'AVIXA DISCAS D/H RATIO',
        value: `${telemetry.dhRatio}x H`,
        sub: telemetry.dhLabel,
        accent: dhColor,
      },
      {
        label: 'HORIZONTAL OFF-AXIS',
        value: `${telemetry.offAxisAngle}°`,
        sub: telemetry.angleLabel,
        accent: angleColor,
      },
    ];

    const cardW = (W - 80 - 32) / 3;
    const cardY = 82;
    const cardH = 136;

    cards.forEach((c, i) => {
      const cx = 40 + i * (cardW + 16);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardW, cardH, 14);
      ctx.fill();

      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(c.label, cx + 20, cardY + 32);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px monospace';
      ctx.fillText(c.value, cx + 20, cardY + 84);

      ctx.fillStyle = c.accent;
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(c.sub, cx + 20, cardY + 116);
    });

    // Bottom Controls & Source Info Bar
    const sourceLabel =
      sourceType === 'hdmi-capture'
        ? 'LIVE HDMI CAPTURE'
        : sourceType === 'screen-share'
        ? 'LIVE SCREEN SHARE'
        : sourceType === 'pdf'
        ? `SLIDE DECK (${currentSlideIndex + 1}/${ Math.max(1, slides.length) })`
        : 'TEST PATTERN';

    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `[A/X or 1-4] Seat Preset  •  [B/Y or R] Recenter  •  [Grip or L] Light (${lightingPreset})  •  [StickClick or H] Hide HUD`,
      40,
      H - 30
    );

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(sourceLabel, W - 40, H - 30);

    hudTexture.needsUpdate = true;
  }, [
    isVrPresenting,
    vrHudVisible,
    telemetry,
    seatPosition,
    sourceType,
    slides.length,
    currentSlideIndex,
    screenWidth,
    screenHeight,
    lightingPreset,
    hudCanvas,
    hudTexture,
  ]);

  // 6. Frame Loop: Initial VR recenter, 1.2m Seated Height Lock, Controller Floor Raycasting & Gamepad Polling
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, _delta, xrFrame?: XRFrame) => {
    if (!gl.xr.isPresenting) return;

    // Read raw hardware headset pose directly from WebXR frame & reference space
    const frame = xrFrame || gl.xr.getFrame();
    const refSpace = gl.xr.getReferenceSpace();
    if (frame && refSpace) {
      const viewerPose = frame.getViewerPose(refSpace);
      if (viewerPose) {
        const p = viewerPose.transform.position;
        const o = viewerPose.transform.orientation;
        latestRawPosRef.current.set(p.x, p.y, p.z);
        latestRawQuatRef.current.set(o.x, o.y, o.z, o.w);
        hasValidPoseRef.current = true;

        // Calibrate to 1.2m sitting eye height & stage-forward yaw across initial entry frames
        if (needsInitialRecenterRef.current || sessionStartFramesRef.current < 20) {
          needsInitialRecenterRef.current = false;
          sessionStartFramesRef.current += 1;
          calibrateHeadPose();
        } else {
          // Guardrail: keep vertical eye level anchored around 1.2m sitting height (±0.18m natural head nod)
          // Prevents ever sinking toward or below the floor plane if headset is picked up or OpenXR floor shifts
          const targetEyeY = useStageStore.getState().seatPosition[1] + SEATED_EYE_HEIGHT;
          const currentEyeY =
            (rigGroupRef.current?.position.y ?? targetEyeY) + latestRawPosRef.current.y;
          if (Math.abs(currentEyeY - targetEyeY) > 0.18) {
            resetVerticalSittingHeight();
          }
        }
      }
    }

    // Raycast controllers against floor plane (y = 0) for click-to-sit teleportation
    let foundFloorHit: THREE.Vector3 | null = null;
    for (let i = 0; i < 2; i++) {
      const ctrl = gl.xr.getController(i);
      if (!ctrl || !ctrl.visible) continue;

      tempMatrix.identity().extractRotation(ctrl.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      if (raycaster.ray.direction.y < -0.05) {
        const hit = raycaster.ray.intersectPlane(FLOOR_PLANE, hitPoint);
        if (hit) {
          const halfW = venueWidth / 2 - 0.8;
          const halfL = venueLength / 2 - 0.8;
          if (Math.abs(hit.x) <= halfW && Math.abs(hit.z) <= halfL) {
            foundFloorHit = hit.clone();
            break;
          }
        }
      }
    }

    hoveredFloorPointRef.current = foundFloorHit;
    if (reticleRef.current) {
      if (foundFloorHit && hasControllers) {
        reticleRef.current.visible = true;
        reticleRef.current.position.set(foundFloorHit.x, 0.03, foundFloorHit.z);
      } else {
        reticleRef.current.visible = false;
      }
    }

    // Poll WebXR Controller Gamepads (Quest Touch buttons & thumbsticks)
    const session = gl.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
      if (!source.gamepad) continue;
      const gp = source.gamepad;
      const hand = source.handedness || 'unknown';

      // Button 4 = A (Right) / X (Left) -> Cycle Seat Presets
      const btnA = gp.buttons[4]?.pressed ?? false;
      const keyA = `${hand}-btn4`;
      if (btnA && !prevButtonStatesRef.current[keyA]) {
        useStageStore.getState().cycleSeatPreset(1);
      }
      prevButtonStatesRef.current[keyA] = btnA;

      // Button 5 = B (Right) / Y (Left) -> Recenter VR View & Reset 1.2m Sitting Height
      const btnB = gp.buttons[5]?.pressed ?? false;
      const keyB = `${hand}-btn5`;
      if (btnB && !prevButtonStatesRef.current[keyB]) {
        calibrateHeadPose();
      }
      prevButtonStatesRef.current[keyB] = btnB;

      // Button 3 = Thumbstick Click -> Toggle In-VR Telemetry HUD
      const btnStick = gp.buttons[3]?.pressed ?? false;
      const keyStick = `${hand}-btn3`;
      if (btnStick && !prevButtonStatesRef.current[keyStick]) {
        const st = useStageStore.getState();
        st.setVrHudVisible(!st.vrHudVisible);
      }
      prevButtonStatesRef.current[keyStick] = btnStick;

      // Thumbstick X-axis (axes[2]) -> Scrub PDF slides or cycle seat presets
      const axisX = gp.axes[2] ?? 0;
      const stickKeyX = `${hand}-axisX`;
      if (Math.abs(axisX) > 0.65) {
        if (!prevStickStatesRef.current[stickKeyX]) {
          prevStickStatesRef.current[stickKeyX] = true;
          const st = useStageStore.getState();
          const dir = axisX > 0 ? 1 : -1;
          if (st.sourceType === 'pdf' && st.slides.length > 1) {
            const nextSlide = Math.max(
              0,
              Math.min(st.slides.length - 1, st.currentSlideIndex + dir)
            );
            st.setCurrentSlideIndex(nextSlide);
          } else {
            st.cycleSeatPreset(dir as 1 | -1);
          }
        }
      } else if (Math.abs(axisX) < 0.3) {
        prevStickStatesRef.current[stickKeyX] = false;
      }
    }
  });

  return (
    <>
      {/* VR Seated Camera & Controller Rig */}
      <group ref={rigGroupRef} />

      {/* Seat-Anchored In-VR Floating Sightline Telemetry Console (Always at 1.2m Seated Reference) */}
      <group ref={hudAnchorGroupRef} position={[seatPosition[0], seatPosition[1] + 1.2, seatPosition[2]]}>
        {isVrPresenting && vrHudVisible && (
          <mesh position={[0, -0.44, -1.35]} rotation={[-0.36, 0, 0]}>
            <planeGeometry args={[1.15, 0.34]} />
            <meshBasicMaterial
              map={hudTexture}
              transparent
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>

      {/* Floor Teleport Reticle Ring in VR */}
      <mesh
        ref={reticleRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
        visible={false}
      >
        <ringGeometry args={[0.25, 0.35, 32]} />
        <meshBasicMaterial color="#06b6d4" side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
    </>
  );
};

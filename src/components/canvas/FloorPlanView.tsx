import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Html, OrthographicCamera } from '@react-three/drei';
import { useStageStore, selectPrimaryScreen, CUSTOM_VIEW_COUNT, CustomSeatView } from '../../store/useStageStore';
import {
  defaultCutHeight,
  firstHitBelow,
  normaliseYaw,
  planFrame,
  yawBetween,
} from '../../utils/floorPlan';
import { DEFAULT_VIEW_FOV, SEATED_EYE_HEIGHT, viewPitchTowardsScreen } from '../../utils/storyboard';

/** A drag shorter than this leaves the view aimed at the screen. */
const AIM_THRESHOLD = 0.3;
const MIN_ZOOM_SCALE = 0.25;
const MAX_ZOOM_SCALE = 8;
const MARKER_RADIUS = 0.4;

const SLOT_COLOUR = '#38bdf8';
const ACTIVE_COLOUR = '#f0b135';

const roundCm = (v: number) => Math.round(v * 100) / 100;

interface DragState {
  position: [number, number, number];
  startedAimed: boolean;
}

const ViewMarker: React.FC<{ view: CustomSeatView; label: number; active: boolean }> = ({ view, label, active }) => {
  const colour = active ? ACTIVE_COLOUR : SLOT_COLOUR;
  return (
    <group position={[view.position[0], view.position[1] + 0.02, view.position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
        <circleGeometry args={[MARKER_RADIUS, 32]} />
        <meshBasicMaterial color={colour} depthTest={false} toneMapped={false} />
      </mesh>
      {/* Lies along the floor, pointing the way the camera looks */}
      <group rotation={[0, view.yaw, 0]}>
        <mesh position={[0, 0.05, MARKER_RADIUS + 0.4]} rotation={[Math.PI / 2, 0, 0]} renderOrder={11}>
          <coneGeometry args={[0.3, 0.8, 16]} />
          <meshBasicMaterial color={colour} depthTest={false} toneMapped={false} />
        </mesh>
      </group>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div
          className="pointer-events-none select-none text-[11px] font-extrabold leading-none w-5 h-5 flex items-center justify-center"
          style={{ background: '#0d121b', color: colour, border: `1px solid ${colour}` }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
};

/**
 * Top-down floor plan of a custom venue. Swaps in an orthographic camera,
 * slices the model at a cut height so the roof and upper floors drop away,
 * and lets the user click to place a camera view and drag to point it.
 */
export const FloorPlanView: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);

  const bounds = useStageStore((s) => s.customVenueBounds);
  const cutHeight = useStageStore((s) => s.floorPlanCutHeight);
  const customSeatViews = useStageStore((s) => s.customSeatViews);
  const slot = useStageStore((s) => s.floorPlanSlot);
  const screens = useStageStore((s) => s.screens);
  const primaryScreenId = useStageStore((s) => s.primaryScreenId);

  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [preview, setPreview] = useState<CustomSeatView | null>(null);

  const frame = useMemo(
    () => (bounds ? planFrame(bounds, size.width, size.height) : null),
    [bounds, size.width, size.height],
  );
  const cutY = bounds ? cutHeight ?? defaultCutHeight(bounds) : 0;

  // Aim the camera straight down with the screen wall at the top of the plan
  useLayoutEffect(() => {
    const cam = cameraRef.current;
    if (!cam || !frame || !bounds) return;
    const [cx, , cz] = frame.center;
    cam.up.set(0, 0, -1);
    cam.position.set(cx, bounds.max[1] + 20, cz);
    cam.lookAt(cx, 0, cz);
    cam.updateMatrixWorld();
    cam.updateProjectionMatrix();
  }, [frame, bounds]);

  // Section cut: keep everything at or below cutY. The renderer-level plane
  // applies to every material, so it's removed again on the way out.
  useEffect(() => {
    if (!bounds) return;
    gl.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), cutY)];
    return () => {
      gl.clippingPlanes = [];
    };
  }, [gl, bounds, cutY]);

  // Mouse wheel zoom, about the plan centre
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomScale((z) => Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, z * Math.exp(-e.deltaY * 0.001))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl]);

  // Place a view: press on the floor, drag to aim, release to commit
  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let drag: DragState | null = null;

    const setRay = (e: PointerEvent): THREE.OrthographicCamera | null => {
      const cam = cameraRef.current;
      if (!cam) return null;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, cam);
      return cam;
    };

    const defaultYaw = (position: [number, number, number]) =>
      yawBetween(position, selectPrimaryScreen(useStageStore.getState()).position);

    // A full view for a floor point and heading: looks at the screen's height, keeps the current field of view
    const viewFor = (position: [number, number, number], yaw: number): CustomSeatView => {
      const state = useStageStore.getState();
      const eye: [number, number, number] = [position[0], position[1] + SEATED_EYE_HEIGHT, position[2]];
      return {
        position,
        yaw,
        pitch: viewPitchTowardsScreen(eye, selectPrimaryScreen(state).position),
        fov: state.fovMode === 'eye-focus' ? 25 : DEFAULT_VIEW_FOV,
        name: state.customSeatViews[state.floorPlanSlot]?.name ?? '',
      };
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !setRay(e)) return;
      const venue = scene.getObjectByName('custom-venue');
      if (!venue) return;
      // Raycasts ignore clipping planes, so skip anything above the cut
      const hit = firstHitBelow(raycaster.intersectObject(venue, true), cutY);
      if (!hit) return;
      const position: [number, number, number] = [roundCm(hit.point.x), roundCm(hit.point.y), roundCm(hit.point.z)];
      drag = { position, startedAimed: false };
      setPreview({ ...viewFor(position, defaultYaw(position)) });
    };

    // Heading for a drag as of this pointer event: aimed at the pointer once it
    // has moved far enough, otherwise at the screen
    const yawFor = (d: DragState, e: PointerEvent): number => {
      if (setRay(e)) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -d.position[1]);
        const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (point) {
          if (Math.hypot(point.x - d.position[0], point.z - d.position[2]) > AIM_THRESHOLD) d.startedAimed = true;
          if (d.startedAimed) return normaliseYaw(yawBetween(d.position, [point.x, point.y, point.z]));
        }
      }
      return normaliseYaw(defaultYaw(d.position));
    };

    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      setPreview(viewFor(drag.position, yawFor(drag, e)));
    };

    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      const finished = drag;
      drag = null;
      setPreview(null);
      const yaw = yawFor(finished, e);

      const state = useStageStore.getState();
      const committed = state.floorPlanSlot;
      state.setCustomSeatView(committed, viewFor(finished.position, yaw));

      // Move on to the next empty slot, or stay put when all four are placed
      const views = useStageStore.getState().customSeatViews;
      for (let step = 1; step < CUSTOM_VIEW_COUNT; step++) {
        const next = (committed + step) % CUSTOM_VIEW_COUNT;
        if (!views[next]) {
          state.setFloorPlanSlot(next);
          break;
        }
      }
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl, scene, cutY]);

  if (!bounds || !frame) return null;

  const farClip = bounds.max[1] - bounds.min[1] + 100;
  const markerYFor = (y: number) => Math.min(cutY - 0.05, Math.max(bounds.min[1] + 0.05, y));

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        near={0.1}
        far={farClip}
        zoom={frame.zoom * zoomScale}
      />

      {customSeatViews.map((view, i) =>
        view && !(preview && i === slot) ? (
          <ViewMarker key={i} view={view} label={i + 1} active={i === slot} />
        ) : null,
      )}
      {preview && <ViewMarker view={preview} label={slot + 1} active />}

      {/* Where each screen is, for orientation: a bar as wide as the screen, primary brightest */}
      {screens.map((screen) => {
        const isPrimary = screen.id === primaryScreenId;
        return (
          <group
            key={screen.id}
            position={[screen.position[0], markerYFor(screen.position[1]), screen.position[2]]}
            rotation={[0, screen.rotation[1], 0]}
          >
            <mesh renderOrder={isPrimary ? 9 : 8}>
              <boxGeometry args={[screen.width, 0.05, isPrimary ? 0.3 : 0.2]} />
              <meshBasicMaterial color={isPrimary ? '#e2e8f0' : '#64748b'} depthTest={false} toneMapped={false} />
            </mesh>
            <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }} position={[0, 0, -0.8]}>
              <div
                className={`pointer-events-none select-none text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap ${
                  isPrimary ? 'text-ink' : 'text-ink/60'
                }`}
              >
                {isPrimary ? `${screen.name} (primary)` : screen.name}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
};

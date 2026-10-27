import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useStageStore } from '../../store/useStageStore';
import { DemoBallroom } from './DemoBallroom';
import { CustomGlbVenue } from './CustomGlbVenue';
import { ScreenArray } from './ScreenArray';
import { PresenterSilhouette } from './PresenterSilhouette';
import { CameraController } from './CameraController';
import { VrControllerRig } from './VrControllerRig';
import { FloorPlanView } from './FloorPlanView';
import { sideLightColours } from '../../utils/sideLightColours';

export const StageCanvas: React.FC = () => {
  const venueSource = useStageStore((s) => s.venueSource);
  const navigationMode = useStageStore((s) => s.navigationMode);
  const isPickingMesh = useStageStore((s) => s.isPickingMesh);
  const houseLightsIntensity = useStageStore((s) => s.houseLightsIntensity);
  const stageLightsIntensity = useStageStore((s) => s.stageLightsIntensity);
  const lightingPreset = useStageStore((s) => s.lightingPreset);
  const isVrPresenting = useStageStore((s) => s.isVrPresenting);
  const isFloorPlanOpen = useStageStore((s) => s.isFloorPlanOpen);
  const floorPlanSlot = useStageStore((s) => s.floorPlanSlot);
  const showFloorPlan = venueSource === 'custom-glb' && isFloorPlanOpen && !isVrPresenting;
  const sideLights = sideLightColours(venueSource);

  // Background color subtle tone adjustment based on preset
  const bgColor =
    lightingPreset === 'conference-bright'
      ? '#0f1422'
      : lightingPreset === 'ballroom-standard'
      ? '#0a0d17'
      : '#05070c';

  return (
    <div
      className={`relative w-full h-full ${
        isPickingMesh || showFloorPlan
          ? 'cursor-crosshair'
          : navigationMode === 'seated'
          ? 'cursor-move'
          : 'cursor-default'
      }`}
    >
      <Canvas
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        camera={{
          position: [0, 5, 12],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 45, 100]} />

        {/* ================= Venue Lighting Rig ================= */}
        {/* Architectural Sky/Ground Hemispheric Fill (Lifts room out of darkness) */}
        <hemisphereLight
          args={['#e2e8f0', '#1e293b', houseLightsIntensity * 0.75]}
        />

        {/* Soft Ambient Base */}
        <ambientLight intensity={houseLightsIntensity * 0.35} color="#94a3b8" />

        {/* Audience House Downlights Rig (Front, Mid, Rear Seating) */}
        <directionalLight
          position={[0, 16, -2]}
          intensity={houseLightsIntensity * 0.7}
          color="#f1f5f9"
        />
        <directionalLight
          position={[0, 16, 7]}
          intensity={houseLightsIntensity * 0.8}
          color="#f1f5f9"
        />
        <directionalLight
          position={[0, 16, 16]}
          intensity={houseLightsIntensity * 0.65}
          color="#f1f5f9"
        />

        {/* Overhead Truss Stage Key Light */}
        <directionalLight
          position={[0, 14, 2]}
          intensity={stageLightsIntensity * 1.2}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={40}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />

        {/* Downstage Presenter Spotlight */}
        <spotLight
          position={[0, 9, -5]}
          target-position={[0, 1, -10]}
          intensity={stageLightsIntensity * 1.6}
          angle={0.65}
          penumbra={0.6}
          color="#ffffff"
          castShadow
        />

        {/* Side kickers for depth: cool and warm in the ballroom, white in an
            uploaded venue so plain materials keep their own colours */}
        <directionalLight
          position={[-15, 8, -5]}
          intensity={stageLightsIntensity * 0.5}
          color={sideLights.left}
        />
        <directionalLight
          position={[15, 8, -5]}
          intensity={stageLightsIntensity * 0.5}
          color={sideLights.right}
        />

        {/* ================= 3D Scene Elements ================= */}
        <Suspense fallback={null}>
          {venueSource === 'default-ballroom' ? (
            <DemoBallroom />
          ) : (
            <CustomGlbVenue />
          )}

          <ScreenArray />
          <PresenterSilhouette />
        </Suspense>

        <CameraController />
        {showFloorPlan && <FloorPlanView />}
        <VrControllerRig />
      </Canvas>

      {/* Helpful Viewport Navigation Overlay Hint */}
      <div
        className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3.5 py-1.5 flex items-center gap-2.5 text-xs text-ink/80 border border-ink/20 ${
          (isPickingMesh || showFloorPlan) && !isVrPresenting ? 'bg-standby' : 'bg-surface/90'
        }`}
      >
        {isVrPresenting ? (
          <span className="tag tag-live">Live</span>
        ) : (
          <span className="signal-dot bg-ink/60" />
        )}
        {isVrPresenting ? (
          <span>
            <strong className="font-extrabold text-ink">Meta Quest VR Active:</strong> Keys <kbd className="kbd">1–4</kbd> or <kbd className="kbd">A/X</kbd> Seat Presets &bull; <kbd className="kbd">R</kbd> or <kbd className="kbd">B/Y</kbd> Recenter &bull; <kbd className="kbd">L</kbd> Lighting &bull; <kbd className="kbd">H</kbd> Toggle VR HUD
          </span>
        ) : showFloorPlan ? (
          <span>
            <strong className="font-extrabold text-ink">Floor Plan:</strong> click the floor to place View {floorPlanSlot + 1}, drag to aim it &bull; <kbd className="kbd">Esc</kbd> to close
          </span>
        ) : isPickingMesh ? (
          <span className="font-semibold text-ink">Click a mesh in the 3D model to make it a screen &bull; <kbd className="kbd">Shift + Click</kbd> to add several</span>
        ) : navigationMode === 'seated' ? (
          <span>
            <strong className="font-extrabold text-ink">Seated View:</strong> Click & drag to look around &bull; Click any floor area to change seats &bull; Keys <kbd className="kbd">1–4</kbd> Seat Presets
          </span>
        ) : (
          <span>
            <strong className="font-extrabold text-ink">Orbit View:</strong> Left-drag to rotate &bull; Right-drag to pan &bull; <kbd className="kbd">Shift + Click</kbd> floor to sit &bull; Keys <kbd className="kbd">1–4</kbd> Seat Presets
          </span>
        )}
      </div>
    </div>
  );
};

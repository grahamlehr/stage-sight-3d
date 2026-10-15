import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useStageStore } from '../../store/useStageStore';
import { DemoBallroom } from './DemoBallroom';
import { CustomGlbVenue } from './CustomGlbVenue';
import { ScreenSurface } from './ScreenSurface';
import { PresenterSilhouette } from './PresenterSilhouette';
import { CameraController } from './CameraController';

export const StageCanvas: React.FC = () => {
  const venueSource = useStageStore((s) => s.venueSource);
  const navigationMode = useStageStore((s) => s.navigationMode);
  const isPickingMesh = useStageStore((s) => s.isPickingMesh);
  const houseLightsIntensity = useStageStore((s) => s.houseLightsIntensity);
  const stageLightsIntensity = useStageStore((s) => s.stageLightsIntensity);
  const lightingPreset = useStageStore((s) => s.lightingPreset);

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
        isPickingMesh
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

        {/* Warm & Cool Side Kickers for Architectural Depth */}
        <directionalLight
          position={[-15, 8, -5]}
          intensity={stageLightsIntensity * 0.5}
          color="#38bdf8"
        />
        <directionalLight
          position={[15, 8, -5]}
          intensity={stageLightsIntensity * 0.5}
          color="#f59e0b"
        />

        {/* ================= 3D Scene Elements ================= */}
        <Suspense fallback={null}>
          {venueSource === 'default-ballroom' ? (
            <DemoBallroom />
          ) : (
            <CustomGlbVenue />
          )}

          <ScreenSurface />
          <PresenterSilhouette />
        </Suspense>

        <CameraController />
      </Canvas>

      {/* Helpful Viewport Navigation Overlay Hint */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3.5 py-1.5 rounded-full bg-zinc-900/85 backdrop-blur border border-zinc-700/60 shadow-lg flex items-center gap-2.5 text-xs text-zinc-300">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        {isPickingMesh ? (
          <span className="font-semibold text-cyan-300">Click any mesh in the 3D model to bind the LED screen</span>
        ) : navigationMode === 'seated' ? (
          <span>
            <strong className="text-cyan-300">Seated View:</strong> Click & drag to look around &bull; Click any floor area to change seats &bull; Switch to Orbit in top bar
          </span>
        ) : (
          <span>
            <strong className="text-zinc-100">Orbit View:</strong> Left-drag to rotate &bull; Right-drag to pan &bull; <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-cyan-300 text-[10px]">Shift + Click</kbd> floor to sit
          </span>
        )}
      </div>
    </div>
  );
};

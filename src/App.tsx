import React from 'react';
import { StageCanvas } from './components/canvas/StageCanvas';
import { TelemetryHUD } from './components/ui/TelemetryHUD';
import { Sidebar } from './components/ui/Sidebar';
import { TransportBar } from './components/ui/TransportBar';
import { FirstRunGuide } from './components/ui/FirstRunGuide';
import { useStageStore } from './store/useStageStore';

export const App: React.FC = () => {
  const isGuideOpen = useStageStore((s) => s.isGuideOpen);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-ground select-none">
      {/* 3D Viewport */}
      <main className="absolute inset-0 z-0">
        <StageCanvas />
      </main>

      {/* Top Floating Telemetry & Presets HUD */}
      <TelemetryHUD />

      {/* Left Collapsible Setup & Ingestion Panel */}
      <Sidebar />

      {/* Bottom PDF / Presentation Deck Scrubber */}
      <TransportBar />

      {/* First-run tour (reopened from the About panel) */}
      {isGuideOpen && <FirstRunGuide />}
    </div>
  );
};

export default App;

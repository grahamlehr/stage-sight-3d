import React from 'react';
import { StageCanvas } from './components/canvas/StageCanvas';
import { TelemetryHUD } from './components/ui/TelemetryHUD';
import { Sidebar } from './components/ui/Sidebar';
import { TransportBar } from './components/ui/TransportBar';

export const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 select-none">
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
    </div>
  );
};

export default App;

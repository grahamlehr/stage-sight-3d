import React, { useEffect } from 'react';
import { StageCanvas } from './components/canvas/StageCanvas';
import { TelemetryHUD } from './components/ui/TelemetryHUD';
import { Sidebar } from './components/ui/Sidebar';
import { TransportBar } from './components/ui/TransportBar';
import { FirstRunGuide } from './components/ui/FirstRunGuide';
import { hasUnsavedRoomChanges, useStageStore } from './store/useStageStore';
import { openRoomFromFile } from './utils/openRoomFile';

export const App: React.FC = () => {
  const isGuideOpen = useStageStore((s) => s.isGuideOpen);

  // Warn before the tab closes with unsaved room edits
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedRoomChanges(useStageStore.getState())) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    const room = Array.from(e.dataTransfer.files).find((f) => f.name.toLowerCase().endsWith('.stagesight'));
    if (!room) return;
    e.preventDefault();
    void openRoomFromFile(room);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-ground select-none">
      {/* 3D Viewport */}
      <main className="absolute inset-0 z-0" onDragOver={handleDragOver} onDrop={handleDrop}>
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

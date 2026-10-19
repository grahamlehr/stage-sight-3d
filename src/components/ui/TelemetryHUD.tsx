import React, { useState } from 'react';
import {
  Eye,
  Maximize2,
  Compass,
  Armchair,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  Sun,
  Glasses,
  RotateCcw,
} from 'lucide-react';
import { useStageStore, SEAT_PRESETS } from '../../store/useStageStore';
import { Logo } from './Logo';
import { AboutModal } from './AboutModal';

export const TelemetryHUD: React.FC = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isVrHelpOpen, setIsVrHelpOpen] = useState(false);
  const telemetry = useStageStore((s) => s.telemetry);
  const navigationMode = useStageStore((s) => s.navigationMode);
  const setNavigationMode = useStageStore((s) => s.setNavigationMode);
  const fovMode = useStageStore((s) => s.fovMode);
  const setFovMode = useStageStore((s) => s.setFovMode);
  const applySeatPreset = useStageStore((s) => s.applySeatPreset);
  const isSidebarOpen = useStageStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useStageStore((s) => s.setIsSidebarOpen);
  const lightingPreset = useStageStore((s) => s.lightingPreset);
  const setLightingPreset = useStageStore((s) => s.setLightingPreset);
  const houseLightsIntensity = useStageStore((s) => s.houseLightsIntensity);
  const setHouseLightsIntensity = useStageStore((s) => s.setHouseLightsIntensity);
  const isVrSupported = useStageStore((s) => s.isVrSupported);
  const isVrPresenting = useStageStore((s) => s.isVrPresenting);
  const toggleVrSession = useStageStore((s) => s.toggleVrSession);
  const triggerVrRecenter = useStageStore((s) => s.triggerVrRecenter);
  const setIsGuideOpen = useStageStore((s) => s.setIsGuideOpen);

  // Badge color helpers
  const getDhColor = (status: string) => {
    switch (status) {
      case 'detail':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'reading':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'marginal':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'fail':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const getAngleColor = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'steep':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'extreme':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  return (
    <header className="absolute top-3 left-3 right-3 z-20 pointer-events-none flex items-center justify-between gap-3">
      {/* Left: Sidebar Toggle & Branding */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          data-guide="sidebar-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 backdrop-blur shadow-md transition"
          title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        <button
          data-guide="about"
          onClick={() => setIsAboutOpen(true)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 backdrop-blur shadow-md transition group text-left"
          title="About StageSight 3D (Click for details)"
        >
          <Logo variant="icon" className="w-5 h-5 group-hover:scale-110 transition-transform" glow />
          <span className="font-bold tracking-tight text-sm text-zinc-100">
            StageSight <span className="text-cyan-400">3D</span>
          </span>
        </button>
      </div>

      {/* Center: Live DISCAS Telemetry Badges */}
      <div
        data-guide="telemetry"
        className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/90 border border-zinc-800/80 backdrop-blur shadow-xl">
        {/* Viewing Distance */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800/80 text-xs">
          <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">Dist (D)</span>
          <span className="font-mono font-bold text-zinc-100">{telemetry.viewingDistance}m</span>
        </div>

        {/* D / H Ratio */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition ${getDhColor(
            telemetry.dhStatus
          )}`}
          title={`AVIXA DISCAS Distance-to-Height Ratio: ${telemetry.dhLabel}`}
        >
          <span className="opacity-70 uppercase tracking-wider text-[10px] font-semibold">D/H</span>
          <span className="font-mono font-bold">{telemetry.dhRatio}x H</span>
          <span className="hidden lg:inline text-[10px] font-medium opacity-90">({telemetry.dhLabel})</span>
        </div>

        {/* Off-Axis Angle */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition ${getAngleColor(
            telemetry.angleStatus
          )}`}
          title={`Horizontal Off-Axis Angle: ${telemetry.angleLabel}`}
        >
          <Compass size={13} className="opacity-80" />
          <span className="font-mono font-bold">{telemetry.offAxisAngle}°</span>
          <span className="hidden md:inline text-[10px] font-medium opacity-90">({telemetry.angleLabel})</span>
        </div>
      </div>

      {/* Right: Camera Mode, Dual-FOV, Seat Presets & Lighting */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Venue Lighting Quick Selector */}
        <div data-guide="lighting" className="relative group">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium shadow-md backdrop-blur transition ${
              lightingPreset === 'conference-bright'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
            }`}
            title="Venue Lighting Rig & House Lights"
          >
            <Sun size={14} className={lightingPreset === 'conference-bright' ? 'text-amber-400' : 'text-zinc-400'} />
            <span className="hidden sm:inline">
              {lightingPreset === 'conference-bright'
                ? 'Bright'
                : lightingPreset === 'ballroom-standard'
                ? 'Standard'
                : 'Keynote Dark'}
            </span>
          </button>
          <div className="absolute right-0 top-full mt-1.5 w-64 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl backdrop-blur hidden group-hover:block transition animate-in fade-in duration-100 space-y-2.5">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Sun size={11} className="text-amber-400" /> Room Lighting Rig
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setLightingPreset('conference-bright')}
                className={`py-1 px-1 rounded text-center text-[11px] font-medium transition ${
                  lightingPreset === 'conference-bright'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Bright
              </button>
              <button
                onClick={() => setLightingPreset('ballroom-standard')}
                className={`py-1 px-1 rounded text-center text-[11px] font-medium transition ${
                  lightingPreset === 'ballroom-standard'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setLightingPreset('keynote-dark')}
                className={`py-1 px-1 rounded text-center text-[11px] font-medium transition ${
                  lightingPreset === 'keynote-dark'
                    ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Dark
              </button>
            </div>

            {/* House Lights Slider */}
            <div className="pt-1.5 border-t border-zinc-800/80">
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                <span>Audience House Lights</span>
                <span className="font-mono text-zinc-200">{Math.round(houseLightsIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.2"
                step="0.05"
                value={houseLightsIntensity}
                onChange={(e) => setHouseLightsIntensity(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1 bg-zinc-800 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Seat Presets Dropdown */}
        <div data-guide="seat-presets" className="relative group">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 backdrop-blur text-xs font-medium shadow-md transition">
            <Armchair size={14} className="text-cyan-400" />
            <span className="hidden sm:inline">Seat Presets</span>
          </button>
          <div className="absolute right-0 top-full mt-1.5 w-64 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl backdrop-blur hidden group-hover:block transition animate-in fade-in duration-100">
            <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <Info size={11} /> Quick Sightline Tests
            </div>
            {SEAT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applySeatPreset(preset.id)}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-800/80 text-xs transition flex flex-col"
              >
                <span className="font-medium text-zinc-100">{preset.name}</span>
                <span className="text-[10px] text-zinc-400">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dual FOV Toggle */}
        <div data-guide="fov" className="flex items-center rounded-lg bg-zinc-900/90 border border-zinc-800 p-0.5 backdrop-blur shadow-md">
          <button
            onClick={() => setFovMode('room-context')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              fovMode === 'room-context'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="50° Vertical FOV: Stage framing and peripheral room sightlines"
          >
            <Maximize2 size={13} />
            <span className="hidden sm:inline">50° Room</span>
          </button>
          <button
            onClick={() => setFovMode('eye-focus')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              fovMode === 'eye-focus'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="25° Vertical FOV: Simulates human foveal focus for text legibility"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">25° Eye Focus</span>
          </button>
        </div>

        {/* Navigation Mode Switcher */}
        <button
          data-guide="navigation"
          onClick={() => setNavigationMode(navigationMode === 'orbit' ? 'seated' : 'orbit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium shadow-md backdrop-blur transition ${
            navigationMode === 'seated'
              ? 'bg-cyan-500 text-zinc-950 border-cyan-400 font-semibold'
              : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
          }`}
        >
          <Armchair size={14} />
          <span>{navigationMode === 'seated' ? 'Seated @ 1.2m' : 'Orbit Camera'}</span>
        </button>

        {/* Meta Quest / PCVR WebXR Controls */}
        <div data-guide="vr" className="relative flex items-center gap-1.5">
          {isVrPresenting && (
            <button
              onClick={triggerVrRecenter}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-cyan-300 border border-cyan-500/40 backdrop-blur text-xs font-medium shadow-md transition"
              title="Recenter VR Headset Forward Direction (Hotkey: R or B/Y on Quest controller)"
            >
              <RotateCcw size={13} />
              <span className="hidden xl:inline">Recenter</span>
            </button>
          )}

          <button
            onClick={() => {
              if (isVrSupported && toggleVrSession) {
                void toggleVrSession().catch((err) =>
                  console.error('VR session toggle failed:', err)
                );
              } else {
                setIsVrHelpOpen(!isVrHelpOpen);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-md backdrop-blur transition ${
              isVrPresenting
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                : isVrSupported
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title={
              isVrPresenting
                ? 'Exit Meta Quest VR Session'
                : isVrSupported
                ? 'Enter Meta Quest WebXR Immersive Preview'
                : 'Meta Quest VR / PCVR Setup & Controls'
            }
          >
            <Glasses size={15} className={isVrSupported && !isVrPresenting ? 'text-cyan-400' : ''} />
            <span>
              {isVrPresenting ? 'Exit VR' : isVrSupported ? 'Enter VR' : 'VR Preview'}
            </span>
            {isVrSupported && !isVrPresenting && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* PCVR + HDMI Capture Setup & Controls Popover */}
          {isVrHelpOpen && !isVrPresenting && (
            <div className="absolute right-0 top-full mt-2 w-80 p-3.5 rounded-xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl backdrop-blur z-30 text-xs text-zinc-300 space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-100">
                  <Glasses size={14} className="text-cyan-400" />
                  <span>Meta Quest PCVR + HDMI Workflow</span>
                </div>
                <button
                  onClick={() => setIsVrHelpOpen(false)}
                  className="text-zinc-400 hover:text-white text-[11px] px-1.5 py-0.5 rounded bg-zinc-800"
                >
                  Close
                </button>
              </div>

              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                No active WebXR headset detected in this browser tab yet.
              </div>

              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-zinc-300 leading-relaxed">
                <li>
                  Connect your Meta Quest to your PC via <strong>Quest Link</strong> or <strong>Air Link</strong> (or open directly in Quest Browser).
                </li>
                <li>
                  In the Meta Quest PC app, verify <strong>Settings &rarr; General &rarr; OpenXR Runtime</strong> is set as active.
                </li>
                <li>
                  Open this page in <strong>Chrome</strong> or <strong>Edge</strong> on the PC, select your <strong>HDMI Capture</strong> card in the left sidebar, and click <strong>Enter VR</strong>.
                </li>
              </ol>

              <div className="pt-2 border-t border-zinc-800 space-y-1 text-[11px]">
                <div className="font-semibold text-zinc-200 uppercase tracking-wider text-[10px]">
                  VR &amp; Desk Hotkeys
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Cycle Seat Presets</span>
                  <span className="font-mono text-cyan-300">Keys 1–4 or A/X</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Recenter Headset View</span>
                  <span className="font-mono text-cyan-300">Key R or B/Y</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Point &amp; Teleport Seat</span>
                  <span className="font-mono text-cyan-300">Quest Trigger</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Cycle Room Lighting</span>
                  <span className="font-mono text-cyan-300">Key L or Grip</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Toggle In-VR HUD</span>
                  <span className="font-mono text-cyan-300">Key H or Stick Click</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* About StageSight 3D Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onStartTour={() => {
          setIsAboutOpen(false);
          setIsGuideOpen(true);
        }}
      />
    </header>
  );
};

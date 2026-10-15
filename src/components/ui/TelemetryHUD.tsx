import React from 'react';
import {
  Eye,
  Maximize2,
  Compass,
  Armchair,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
} from 'lucide-react';
import { useStageStore, SEAT_PRESETS } from '../../store/useStageStore';

export const TelemetryHUD: React.FC = () => {
  const telemetry = useStageStore((s) => s.telemetry);
  const navigationMode = useStageStore((s) => s.navigationMode);
  const setNavigationMode = useStageStore((s) => s.setNavigationMode);
  const fovMode = useStageStore((s) => s.fovMode);
  const setFovMode = useStageStore((s) => s.setFovMode);
  const applySeatPreset = useStageStore((s) => s.applySeatPreset);
  const isSidebarOpen = useStageStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useStageStore((s) => s.setIsSidebarOpen);

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
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 backdrop-blur shadow-md transition"
          title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 backdrop-blur shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="font-bold tracking-tight text-sm text-zinc-100">
            StageSight <span className="text-cyan-400">3D</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
            MVP
          </span>
        </div>
      </div>

      {/* Center: Live DISCAS Telemetry Badges */}
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/90 border border-zinc-800/80 backdrop-blur shadow-xl">
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

      {/* Right: Camera Mode, Dual-FOV & Seat Presets */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Seat Presets Dropdown */}
        <div className="relative group">
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
        <div className="flex items-center rounded-lg bg-zinc-900/90 border border-zinc-800 p-0.5 backdrop-blur shadow-md">
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
      </div>
    </header>
  );
};

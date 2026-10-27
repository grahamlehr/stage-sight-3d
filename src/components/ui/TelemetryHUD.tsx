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
import { useStageStore, getActiveSeatPresets } from '../../store/useStageStore';
import { Logo } from './Logo';
import { AboutModal } from './AboutModal';
import { describeWorstScreen } from '../../utils/worstScreenFlag';

// Tag text below 2xl, where the full DISCAS labels don't fit beside the controls
const DH_SHORT_LABEL: Record<string, string> = {
  detail: 'Detail',
  reading: 'Reading',
  marginal: 'Marginal',
  fail: 'Too far',
};

const ANGLE_SHORT_LABEL: Record<string, string> = {
  optimal: 'On-axis',
  steep: 'Steep',
  extreme: 'Extreme',
};

export const TelemetryHUD: React.FC = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isVrHelpOpen, setIsVrHelpOpen] = useState(false);
  const telemetry = useStageStore((s) => s.telemetry);
  const navigationMode = useStageStore((s) => s.navigationMode);
  const setNavigationMode = useStageStore((s) => s.setNavigationMode);
  const fovMode = useStageStore((s) => s.fovMode);
  const setFovMode = useStageStore((s) => s.setFovMode);
  const applySeatPreset = useStageStore((s) => s.applySeatPreset);
  const venueSource = useStageStore((s) => s.venueSource);
  const customSeatViews = useStageStore((s) => s.customSeatViews);
  const seatPresets = getActiveSeatPresets({ venueSource, customSeatViews });
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

  // Sightline status follows CueSmith's signal rules: an outlined tag with a go
  // dot passes, a warn fill is marginal, and a solid ink tag fails. Fill carries
  // the meaning, so it still reads without color.
  const statusTag = (level: 'go' | 'warn' | 'fail') =>
    level === 'go' ? 'tag-go' : level === 'warn' ? 'tag-warn' : 'tag-solid';

  const dhLevel =
    telemetry.dhStatus === 'detail' || telemetry.dhStatus === 'reading'
      ? 'go'
      : telemetry.dhStatus === 'marginal'
      ? 'warn'
      : 'fail';

  const angleLevel =
    telemetry.angleStatus === 'optimal' ? 'go' : telemetry.angleStatus === 'steep' ? 'warn' : 'fail';

  const worstFlag = describeWorstScreen(telemetry.worst);

  const lightingPresets = [
    { id: 'conference-bright', label: 'Bright' },
    { id: 'ballroom-standard', label: 'Standard' },
    { id: 'keynote-dark', label: 'Dark' },
  ] as const;

  return (
    <header className="absolute top-3 left-3 right-3 z-20 pointer-events-none flex items-center justify-between gap-3">
      {/* Left: Sidebar Toggle & Branding */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          data-guide="sidebar-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="btn btn-secondary btn-icon w-9 h-9"
          title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        <button
          data-guide="about"
          onClick={() => setIsAboutOpen(true)}
          className="btn btn-secondary h-9 gap-2.5 group"
          title="About StageSight 3D (Click for details)"
        >
          <Logo variant="icon" className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-sm tracking-tight">StageSight 3D</span>
        </button>
      </div>

      {/* Center: Live DISCAS Telemetry Badges */}
      <div
        data-guide="telemetry"
        className="panel pointer-events-auto flex items-center gap-3 px-3 py-2 whitespace-nowrap">
        {/* Viewing Distance */}
        <div className="flex items-baseline gap-2">
          <span className="label">Dist (D)</span>
          <span className="text-base font-extrabold tabular-nums">{telemetry.viewingDistance}m</span>
        </div>

        {/* D / H Ratio */}
        <div
          className="flex items-center gap-2 pl-3 border-l border-ink/20"
          title={`AVIXA DISCAS Distance-to-Height Ratio: ${telemetry.dhLabel}`}
        >
          <span className="label">D/H</span>
          <span className="text-base font-extrabold tabular-nums">{telemetry.dhRatio}x H</span>
          <span className={`tag ${statusTag(dhLevel)}`}>
            {dhLevel === 'go' && <span className="signal-dot bg-signal-go" />}
            <span className="normal-case font-semibold hidden 2xl:inline">{telemetry.dhLabel}</span>
            <span className="2xl:hidden">{DH_SHORT_LABEL[telemetry.dhStatus] ?? telemetry.dhStatus}</span>
          </span>
        </div>

        {/* Off-Axis Angle */}
        <div
          className="flex items-center gap-2 pl-3 border-l border-ink/20"
          title={`Horizontal Off-Axis Angle: ${telemetry.angleLabel}`}
        >
          <Compass size={14} strokeWidth={1.5} className="text-ink/60" />
          <span className="text-base font-extrabold tabular-nums">{telemetry.offAxisAngle}°</span>
          <span className={`tag ${statusTag(angleLevel)}`}>
            {angleLevel === 'go' && <span className="signal-dot bg-signal-go" />}
            <span className="normal-case font-semibold hidden 2xl:inline">{telemetry.angleLabel}</span>
            <span className="2xl:hidden">{ANGLE_SHORT_LABEL[telemetry.angleStatus] ?? telemetry.angleStatus}</span>
          </span>
        </div>

        {/* Worst other screen, when it reads worse than the primary */}
        {worstFlag && (
          <div className="flex items-center pl-3 border-l border-ink/20">
            <span
              className={`tag ${statusTag(worstFlag.level)}`}
              title="The screen that reads worst from this seat. The numbers beside it are for the primary screen."
            >
              {worstFlag.text}
            </span>
          </div>
        )}
      </div>

      {/* Right: Camera Mode, Dual-FOV, Seat Presets & Lighting */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        {/* Venue Lighting Quick Selector */}
        <div data-guide="lighting" className="relative group">
          <button className="btn btn-secondary" aria-label="Venue Lighting Rig & House Lights">
            <Sun size={14} />
            <span className="hidden min-[1440px]:inline">
              {lightingPreset === 'conference-bright'
                ? 'Bright'
                : lightingPreset === 'ballroom-standard'
                ? 'Standard'
                : 'Keynote Dark'}
            </span>
          </button>
          {/* The padding, not a margin, makes the gap: it is part of the hover area, so
              the menu stays open while the pointer crosses from the button */}
          <div className="absolute right-0 top-full pt-1.5 hidden group-hover:block z-30">
            <div className="panel w-64 p-3 animate-in fade-in duration-100 space-y-3">
              <span className="label flex items-center gap-1">
                <Sun size={11} /> Room Lighting Rig
              </span>

              {/* Presets */}
              <div className="seg w-full">
                {lightingPresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setLightingPreset(p.id)}
                    aria-pressed={lightingPreset === p.id}
                    className="seg-opt flex-1 text-[11px]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* House Lights Slider */}
              <div className="pt-2 border-t border-ink/20">
                <div className="flex justify-between text-[11px] text-ink/60 mb-1">
                  <span>Audience House Lights</span>
                  <span className="font-extrabold text-ink tabular-nums">{Math.round(houseLightsIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.2"
                  step="0.05"
                  value={houseLightsIntensity}
                  onChange={(e) => setHouseLightsIntensity(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Seat Presets Dropdown */}
        <div data-guide="seat-presets" className="relative group">
          <button className="btn btn-secondary" aria-label="Seat Presets">
            <Armchair size={14} />
            <span className="hidden min-[1440px]:inline">Seat Presets</span>
          </button>
          <div className="absolute right-0 top-full pt-1.5 hidden group-hover:block z-30">
            <div className="panel w-64 py-1.5 animate-in fade-in duration-100">
              <span className="label px-3 py-1 flex items-center gap-1">
                <Info size={11} /> Quick Sightline Tests
              </span>
              {seatPresets.map((preset, i) => (
                <button
                  key={preset.id}
                  onClick={() => applySeatPreset(preset.id)}
                  disabled={!preset.placed}
                  className="w-full text-left px-3 py-2 border-t border-ink/[0.12] hover:bg-ink/[0.07] text-xs transition flex items-start gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <span className="font-extrabold tabular-nums text-ink/60">{i + 1}</span>
                  <span className="flex flex-col">
                    <span className="font-semibold">{preset.name}</span>
                    <span className="text-[10px] text-ink/60">
                      {preset.placed ? preset.description : 'Not placed yet — open the floor plan on the Venue tab'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dual FOV Toggle */}
        <div data-guide="fov" className="seg bg-surface">
          <button
            onClick={() => setFovMode('room-context')}
            aria-pressed={fovMode === 'room-context'}
            className="seg-opt py-1.5"
            title="50° Vertical FOV: Stage framing and peripheral room sightlines"
          >
            <Maximize2 size={13} />
            <span className="hidden sm:inline">50° Room</span>
          </button>
          <button
            onClick={() => setFovMode('eye-focus')}
            aria-pressed={fovMode === 'eye-focus'}
            className="seg-opt py-1.5"
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
          aria-pressed={navigationMode === 'seated'}
          className={`btn ${navigationMode === 'seated' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Armchair size={14} />
          <span>{navigationMode === 'seated' ? 'Seated @ 1.2m' : 'Orbit Camera'}</span>
        </button>

        {/* Meta Quest / PCVR WebXR Controls */}
        <div data-guide="vr" className="relative flex items-center gap-1.5">
          {isVrPresenting && (
            <button
              onClick={triggerVrRecenter}
              className="btn btn-secondary"
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
            className={`btn ${isVrPresenting ? 'btn-live' : 'btn-secondary'}`}
            title={
              isVrPresenting
                ? 'Exit Meta Quest VR Session'
                : isVrSupported
                ? 'Enter Meta Quest WebXR Immersive Preview'
                : 'Meta Quest VR / PCVR Setup & Controls'
            }
          >
            <Glasses size={15} />
            <span>
              {isVrPresenting ? 'Exit VR' : isVrSupported ? 'Enter VR' : 'VR Preview'}
            </span>
            {isVrPresenting && <span className="tag bg-white text-accent-700 px-1.5">Live</span>}
            {isVrSupported && !isVrPresenting && (
              <span className="signal-dot bg-signal-go" title="Headset detected" />
            )}
          </button>

          {/* PCVR + HDMI Capture Setup & Controls Popover */}
          {isVrHelpOpen && !isVrPresenting && (
            <div className="panel absolute right-0 top-full mt-2 w-80 p-4 z-30 text-xs space-y-3">
              <div className="flex items-center justify-between border-b-2 border-ink/20 pb-2">
                <div className="flex items-center gap-1.5 font-extrabold">
                  <Glasses size={14} />
                  <span>Meta Quest PCVR + HDMI Workflow</span>
                </div>
                <button
                  onClick={() => setIsVrHelpOpen(false)}
                  className="btn btn-ghost text-[11px] py-1"
                >
                  Close
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="signal-dot bg-signal-warn" />
                No active WebXR headset detected in this browser tab yet.
              </div>

              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-ink/80 leading-relaxed">
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

              <div className="pt-2 border-t border-ink/20 space-y-1.5 text-[11px]">
                <span className="label">VR &amp; Desk Hotkeys</span>
                {[
                  ['Cycle Seat Presets', 'Keys 1–4 or A/X'],
                  ['Recenter Headset View', 'Key R or B/Y'],
                  ['Point & Teleport Seat', 'Quest Trigger'],
                  ['Cycle Room Lighting', 'Key L or Grip'],
                  ['Toggle In-VR HUD', 'Key H or Stick Click'],
                ].map(([action, keys]) => (
                  <div key={action} className="flex justify-between text-ink/60">
                    <span>{action}</span>
                    <span className="font-semibold text-ink">{keys}</span>
                  </div>
                ))}
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

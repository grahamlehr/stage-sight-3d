import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PanelLeft,
  Move,
  Gauge,
  Eye,
  Glasses,
  type LucideIcon,
} from 'lucide-react';
import { useStageStore, SEAT_PRESETS } from '../../store/useStageStore';
import { setGuideDismissed } from '../../utils/firstRunGuide';

// A short step-through tour shown on first visit. Each step spotlights the UI it
// describes (elements tagged with a matching data-guide attribute) and offers a
// button or two to try the control live. The overlay ignores the pointer, so the
// scene and HUD stay usable while the tour is open.

interface GuideStep {
  title: string;
  icon: LucideIcon;
  /** data-guide values to spotlight; any that aren't on screen are skipped */
  targets: string[];
  body: React.ReactNode;
  Actions?: React.FC;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 6;

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px] border border-zinc-700">
    {children}
  </kbd>
);

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    className="px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-[11px] font-medium transition"
  >
    {children}
  </button>
);

const SidebarActions: React.FC = () => {
  const setIsSidebarOpen = useStageStore((s) => s.setIsSidebarOpen);
  const setActiveSidebarTab = useStageStore((s) => s.setActiveSidebarTab);
  const show = (tab: 'source' | 'screen' | 'venue') => {
    setIsSidebarOpen(true);
    setActiveSidebarTab(tab);
  };
  return (
    <>
      <ActionButton onClick={() => show('source')}>Source tab</ActionButton>
      <ActionButton onClick={() => show('screen')}>Screen tab</ActionButton>
      <ActionButton onClick={() => show('venue')}>Venue tab</ActionButton>
    </>
  );
};

const NavigationActions: React.FC = () => {
  const navigationMode = useStageStore((s) => s.navigationMode);
  const setNavigationMode = useStageStore((s) => s.setNavigationMode);
  const applySeatPreset = useStageStore((s) => s.applySeatPreset);
  const [nextPreset, setNextPreset] = useState(0);
  return (
    <>
      <ActionButton onClick={() => setNavigationMode(navigationMode === 'orbit' ? 'seated' : 'orbit')}>
        {navigationMode === 'orbit' ? 'Try seated view' : 'Back to orbit view'}
      </ActionButton>
      <ActionButton
        onClick={() => {
          applySeatPreset(SEAT_PRESETS[nextPreset].id);
          setNextPreset((nextPreset + 1) % SEAT_PRESETS.length);
        }}
      >
        Jump to seat {nextPreset + 1}
      </ActionButton>
    </>
  );
};

const TelemetryReadout: React.FC = () => {
  const telemetry = useStageStore((s) => s.telemetry);
  return (
    <div className="font-mono text-[11px] text-zinc-400">
      Right now: D {telemetry.viewingDistance}m · D/H {telemetry.dhRatio}× · {telemetry.offAxisAngle}° off-axis
    </div>
  );
};

const ViewActions: React.FC = () => {
  const fovMode = useStageStore((s) => s.fovMode);
  const setFovMode = useStageStore((s) => s.setFovMode);
  const cycleLightingPreset = useStageStore((s) => s.cycleLightingPreset);
  return (
    <>
      <ActionButton onClick={() => setFovMode(fovMode === 'room-context' ? 'eye-focus' : 'room-context')}>
        {fovMode === 'room-context' ? 'Try 25° eye focus' : 'Back to 50° room'}
      </ActionButton>
      <ActionButton onClick={cycleLightingPreset}>Cycle lighting</ActionButton>
    </>
  );
};

const STEPS: GuideStep[] = [
  {
    title: 'Welcome to StageSight 3D',
    icon: Sparkles,
    targets: [],
    body: (
      <p>
        Preview your screen from any seat in the room before load-in. This tour covers the controls
        you'll use most and takes about a minute. The app stays live behind it, so try things as you go.
      </p>
    ),
  },
  {
    title: 'Set up the room',
    icon: PanelLeft,
    targets: ['sidebar', 'sidebar-toggle'],
    body: (
      <ul className="space-y-1 list-disc list-inside">
        <li>
          <strong className="text-zinc-100">Source</strong> puts content on the screen: a test pattern, PDF deck,
          image, capture card or screen share.
        </li>
        <li>
          <strong className="text-zinc-100">Screen</strong> sets the size and aspect ratio.
        </li>
        <li>
          <strong className="text-zinc-100">Venue</strong> switches between the built-in ballroom and your own
          .glb model.
        </li>
      </ul>
    ),
    Actions: SidebarActions,
  },
  {
    title: 'Move around the room',
    icon: Move,
    targets: ['navigation', 'seat-presets'],
    body: (
      <ul className="space-y-1 list-disc list-inside">
        <li>
          <strong className="text-zinc-100">Orbit view:</strong> drag to orbit, right-drag to pan, scroll to zoom,{' '}
          <Kbd>Shift</Kbd> + click the floor to sit there.
        </li>
        <li>
          <strong className="text-zinc-100">Seated view:</strong> drag to look around, click the floor to change
          seat.
        </li>
        <li>
          <Kbd>1</Kbd>–<Kbd>4</Kbd> jump to the seat presets.
        </li>
      </ul>
    ),
    Actions: NavigationActions,
  },
  {
    title: 'Read the sightline numbers',
    icon: Gauge,
    targets: ['telemetry'],
    body: (
      <div className="space-y-1.5">
        <p>These update live as you move.</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong className="text-zinc-100">D/H</strong> is viewing distance over screen height. Green is under
            6×, amber up to 8× (small text at risk), red beyond.
          </li>
          <li>
            <strong className="text-zinc-100">Off-axis</strong> is how far to the side you sit. Green is under
            30°, amber up to 45°, red beyond.
          </li>
        </ul>
        <TelemetryReadout />
      </div>
    ),
  },
  {
    title: 'Check what people can read',
    icon: Eye,
    targets: ['fov', 'lighting'],
    body: (
      <ul className="space-y-1 list-disc list-inside">
        <li>
          <strong className="text-zinc-100">50° Room</strong> frames the whole stage.{' '}
          <strong className="text-zinc-100">25° Eye Focus</strong> narrows to what your eyes resolve, so use it to
          judge text.
        </li>
        <li>
          The lighting menu, or <Kbd>L</Kbd>, switches between conference, ballroom and keynote rigs.
        </li>
      </ul>
    ),
    Actions: ViewActions,
  },
  {
    title: 'Present and preview in VR',
    icon: Glasses,
    targets: ['vr', 'about'],
    body: (
      <ul className="space-y-1 list-disc list-inside">
        <li>
          With a deck loaded, <Kbd>←</Kbd> <Kbd>→</Kbd> or <Kbd>Space</Kbd> step through slides.
        </li>
        <li>
          With a WebXR headset connected, <strong className="text-zinc-100">Enter VR</strong> puts you in the
          seat.
        </li>
        <li>
          Click the <strong className="text-zinc-100">StageSight 3D</strong> logo to reopen this tour any time.
        </li>
      </ul>
    ),
  },
];

const measureTargets = (targets: string[]): Rect[] =>
  targets.flatMap((name) => {
    const el = document.querySelector(`[data-guide="${name}"]`);
    if (!el) return [];
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return [];
    return [
      {
        top: r.top - SPOTLIGHT_PADDING,
        left: r.left - SPOTLIGHT_PADDING,
        width: r.width + SPOTLIGHT_PADDING * 2,
        height: r.height + SPOTLIGHT_PADDING * 2,
      },
    ];
  });

/** Tracks the spotlit elements' positions; HUD buttons resize as their labels change. */
const useTargetRects = (targets: string[]): Rect[] => {
  const [rects, setRects] = useState<Rect[]>([]);
  useEffect(() => {
    let frame = 0;
    let lastKey = '';
    const tick = () => {
      const next = measureTargets(targets);
      const key = JSON.stringify(next);
      if (key !== lastKey) {
        lastKey = key;
        setRects(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targets]);
  return rects;
};

export const FirstRunGuide: React.FC = () => {
  const setIsGuideOpen = useStageStore((s) => s.setIsGuideOpen);
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const rects = useTargetRects(step.targets);

  const close = useCallback(() => {
    setGuideDismissed(dontShowAgain);
    setIsGuideOpen(false);
  }, [dontShowAgain, setIsGuideOpen]);

  // Escape closes the tour wherever focus is
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  useEffect(() => {
    primaryButtonRef.current?.focus();
  }, [stepIndex]);

  const Icon = step.icon;
  const Actions = step.Actions;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Dimmed backdrop with a cut-out per spotlit element */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        <defs>
          <mask id="guide-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {rects.map((r, i) => (
              <rect key={i} x={r.left} y={r.top} width={r.width} height={r.height} rx={12} fill="black" />
            ))}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="black"
          fillOpacity={rects.length > 0 ? 0.5 : 0.6}
          mask="url(#guide-spotlight-mask)"
        />
      </svg>

      {rects.map((r, i) => (
        <div
          key={i}
          className="absolute rounded-xl ring-2 ring-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.45)] transition-all duration-200"
          style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
        />
      ))}

      {/* Tour card. Keys typed inside it shouldn't reach the global scene/slide hotkeys. */}
      <div
        role="dialog"
        aria-labelledby="first-run-guide-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
          e.stopPropagation();
        }}
        className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-md rounded-2xl bg-zinc-950/95 border border-zinc-800/90 shadow-2xl backdrop-blur-md text-zinc-300 text-xs ${
          isFirst ? 'top-1/2 -translate-y-1/2' : 'bottom-24'
        }`}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
            <Icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Quick tour · {stepIndex + 1} of {STEPS.length}
            </div>
            <h2 id="first-run-guide-title" className="text-sm font-bold text-white tracking-tight">
              {step.title}
            </h2>
          </div>
          <button
            onClick={close}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition"
            title="Close tour (Esc)"
            aria-label="Close tour"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 space-y-3 leading-relaxed text-[12px]">
          {step.body}
          {Actions && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mr-0.5">Try it</span>
              <Actions />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-4 px-4 py-3 border-t border-zinc-800/80">
          <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="accent-cyan-400"
            />
            Don't show again
          </label>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex ? 'w-4 bg-cyan-400' : 'w-1.5 bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {isFirst ? (
                <button
                  onClick={close}
                  className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white text-[11px] font-medium transition"
                >
                  Skip
                </button>
              ) : (
                <button
                  onClick={() => setStepIndex(stepIndex - 1)}
                  className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-medium transition"
                >
                  <ChevronLeft size={13} /> Back
                </button>
              )}
              <button
                ref={primaryButtonRef}
                onClick={isLast ? close : () => setStepIndex(stepIndex + 1)}
                className="flex items-center gap-0.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-[11px] font-semibold transition"
              >
                {isFirst ? 'Start tour' : isLast ? 'Done' : 'Next'}
                {!isLast && <ChevronRight size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

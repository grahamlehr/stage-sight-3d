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
  <kbd className="kbd">{children}</kbd>
);

const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button onClick={onClick} className="btn btn-secondary px-2.5 py-1 text-[11px]">
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
    <div className="text-[11px] text-ink/60 tabular-nums">
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
          <strong className="font-semibold text-ink">Source</strong> puts content on the screen: a test pattern, PDF deck,
          image, capture card or screen share.
        </li>
        <li>
          <strong className="font-semibold text-ink">Screen</strong> sets the size and aspect ratio.
        </li>
        <li>
          <strong className="font-semibold text-ink">Venue</strong> switches between the built-in ballroom and your own
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
          <strong className="font-semibold text-ink">Orbit view:</strong> drag to orbit, right-drag to pan, scroll to zoom,{' '}
          <Kbd>Shift</Kbd> + click the floor to sit there.
        </li>
        <li>
          <strong className="font-semibold text-ink">Seated view:</strong> drag to look around, click the floor to change
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
            <strong className="font-semibold text-ink">D/H</strong> is viewing distance over screen height. A green dot means
            under 6×, amber means up to 8× (small text at risk), and a solid white tag means beyond.
          </li>
          <li>
            <strong className="font-semibold text-ink">Off-axis</strong> is how far to the side you sit. A green dot
            means under 30°, amber up to 45°, and a solid white tag beyond.
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
          <strong className="font-semibold text-ink">50° Room</strong> frames the whole stage.{' '}
          <strong className="font-semibold text-ink">25° Eye Focus</strong> narrows to what your eyes resolve, so use it to
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
          With a WebXR headset connected, <strong className="font-semibold text-ink">Enter VR</strong> puts you in the
          seat.
        </li>
        <li>
          Click the <strong className="font-semibold text-ink">StageSight 3D</strong> logo to reopen this tour any time.
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
              <rect key={i} x={r.left} y={r.top} width={r.width} height={r.height} fill="black" />
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
          className="absolute border-2 border-ink transition-all duration-200"
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
        className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-md panel text-ink/80 text-xs ${
          isFirst ? 'top-1/2 -translate-y-1/2' : 'bottom-24'
        }`}
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="flex items-center justify-center w-9 h-9 border border-ink/20 text-ink shrink-0">
            <Icon size={18} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="label tabular-nums">
              Quick tour · {stepIndex + 1} of {STEPS.length}
            </div>
            <h2 id="first-run-guide-title" className="text-sm text-ink">
              {step.title}
            </h2>
          </div>
          <button
            onClick={close}
            className="btn btn-ghost btn-icon w-7 h-7 text-ink/60 hover:text-ink"
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
              <span className="label mr-0.5">Try it</span>
              <Actions />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-4 px-4 py-3 border-t-2 border-ink/20">
          <label className="flex items-center gap-1.5 text-[11px] text-ink/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            Don't show again
          </label>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-0.5 transition-all ${i === stepIndex ? 'w-4 bg-ink' : 'w-2 bg-ink/25'}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {isFirst ? (
                <button
                  onClick={close}
                  className="btn btn-ghost text-[11px] text-ink/60 hover:text-ink"
                >
                  Skip
                </button>
              ) : (
                <button
                  onClick={() => setStepIndex(stepIndex - 1)}
                  className="btn btn-secondary gap-0.5 text-[11px]"
                >
                  <ChevronLeft size={13} /> Back
                </button>
              )}
              <button
                ref={primaryButtonRef}
                onClick={isLast ? close : () => setStepIndex(stepIndex + 1)}
                className="btn btn-primary gap-0.5 text-[11px]"
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

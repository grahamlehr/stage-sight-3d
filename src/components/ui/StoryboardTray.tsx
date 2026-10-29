import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronRight, Clapperboard, Map as MapIcon, RotateCcw, Trash2, X } from 'lucide-react';
import {
  SEAT_PRESETS,
  selectPrimaryScreen,
  useStageStore,
  type StoryboardFrame,
  type StoryboardSet,
} from '../../store/useStageStore';
import { MAX_EXTRA_SHOTS, captureWarnings, storyboardShots } from '../../utils/storyboard';
import { toWinAnsi } from '../../utils/storyboardPdf';
import { exportStoryboardPdf } from '../../utils/storyboardPdfExport';
import { downloadBlob } from '../../utils/download';
import { loadAgencyBranding, logoBytesFromDataUrl, logoFromFile, saveAgencyBranding } from '../../utils/agencyBranding';

const isCustomShot = (frame: StoryboardFrame) => frame.shot.id.startsWith('custom-');

const todayIso = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const nextSetLabel = (count: number) => (count === 0 ? 'Your draft' : count === 1 ? 'Our concept' : `Set ${count + 1}`);

const Block: React.FC<{ title: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode }> = ({ title, meta, children }) => (
  <section className="space-y-2.5 pt-4 border-t border-ink/20 first:pt-0 first:border-t-0">
    <div className="flex items-center justify-between gap-2">
      <span className="label flex items-center gap-1.5">{title}</span>
      {meta && <span className="text-[10px] text-ink/60">{meta}</span>}
    </div>
    {children}
  </section>
);

const ErrorLine: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <p role="alert" className="text-[11px] text-accent-400">
      {message}
    </p>
  ) : null;

/** Esc closes the lightbox; ignored while a form field has focus. */
const Lightbox: React.FC<{ frame: StoryboardFrame; onClose: () => void }> = ({ frame, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 bg-ground/90 flex items-center justify-center p-8" onClick={onClose} role="dialog" aria-label={frame.shot.name}>
      <figure className="max-w-full max-h-full">
        <img src={frame.url} alt={frame.shot.name} className="max-w-full max-h-[85vh] border border-ink/20" />
        <figcaption className="mt-2 text-xs text-ink/80">{frame.shot.name}</figcaption>
      </figure>
    </div>
  );
};

const SetReview: React.FC<{
  set: StoryboardSet;
  disabled: boolean;
  onRetake: (setId: string, frameId: string) => void;
  onZoom: (frame: StoryboardFrame) => void;
}> = ({ set, disabled, onRetake, onZoom }) => {
  const renameStoryboardSet = useStageStore((s) => s.renameStoryboardSet);
  const deleteStoryboardSet = useStageStore((s) => s.deleteStoryboardSet);
  const deleteStoryboardFrame = useStageStore((s) => s.deleteStoryboardFrame);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          className="input flex-1"
          value={set.label}
          aria-label="Set name"
          onChange={(e) => renameStoryboardSet(set.id, e.target.value)}
        />
        <span className="text-[10px] text-ink/60 whitespace-nowrap">
          {set.frames.length} {set.frames.length === 1 ? 'frame' : 'frames'}
        </span>
        <button
          className="btn btn-secondary btn-icon"
          disabled={disabled}
          title="Delete this set"
          aria-label={`Delete set ${set.label}`}
          onClick={() => {
            if (window.confirm(`Delete "${set.label}" and its ${set.frames.length} frames?`)) deleteStoryboardSet(set.id);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {set.frames.map((frame) => (
          <div key={frame.id} className="space-y-1">
            <button className="block w-full aspect-video bg-ground border border-ink/20 hover:border-ink/45" onClick={() => onZoom(frame)} title="View larger">
              <img src={frame.url} alt={frame.shot.name} loading="lazy" className="w-full h-full object-cover" />
            </button>
            <div className="flex items-center gap-1">
              <span className="flex-1 truncate text-[11px]" title={frame.shot.name}>
                {frame.shot.name}
              </span>
              {!isCustomShot(frame) && (
                <button
                  className="btn btn-ghost btn-icon w-6 h-6"
                  disabled={disabled}
                  title="Retake this frame"
                  aria-label={`Retake ${frame.shot.name}`}
                  onClick={() => onRetake(set.id, frame.id)}
                >
                  <RotateCcw size={12} />
                </button>
              )}
              <button
                className="btn btn-ghost btn-icon w-6 h-6"
                disabled={disabled}
                title="Delete this frame"
                aria-label={`Delete ${frame.shot.name}`}
                onClick={() => deleteStoryboardFrame(set.id, frame.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ExtraShots: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const venueSource = useStageStore((s) => s.venueSource);
  const allExtras = useStageStore((s) => s.storyboardExtraShots);
  const addExtraShotFromCamera = useStageStore((s) => s.addExtraShotFromCamera);
  const renameExtraShot = useStageStore((s) => s.renameExtraShot);
  const removeExtraShot = useStageStore((s) => s.removeExtraShot);
  const extras = useMemo(() => allExtras.filter((e) => e.venue === venueSource), [allExtras, venueSource]);
  const full = extras.length >= MAX_EXTRA_SHOTS;
  const defaultName = extras.length === 0 ? 'Walk-in' : extras.length === 1 ? "Speaker's view" : `Shot ${extras.length + 1}`;

  return (
    <Block title="Extra shots" meta={`${extras.length} of ${MAX_EXTRA_SHOTS}`}>
      <button className="btn btn-ghost -ml-2" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {open ? 'Hide' : 'Show'}
      </button>
      {open && (
        <div className="space-y-2">
          <p className="text-[11px] text-ink/60">Saved in the room file. Stand at the doors, or on stage at standing eye height, then add.</p>
          {extras.map((extra) => (
            <div key={extra.id} className="flex items-center gap-2">
              <input className="input flex-1" value={extra.name} aria-label="Shot name" onChange={(e) => renameExtraShot(extra.id, e.target.value)} />
              <button className="btn btn-secondary btn-icon" title="Remove this shot" aria-label={`Remove ${extra.name}`} onClick={() => removeExtraShot(extra.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input className="input flex-1" value={name} placeholder={defaultName} aria-label="New shot name" onChange={(e) => setName(e.target.value)} />
            <button
              className="btn btn-secondary"
              disabled={disabled || full}
              onClick={() => {
                const id = addExtraShotFromCamera(name.trim() || defaultName);
                setError(id ? null : "The current view couldn't be saved as a shot.");
                if (id) setName('');
              }}
            >
              Add current view as shot
            </button>
          </div>
          {full && <p className="text-[11px] text-ink/60">This venue has the most extra shots it can hold.</p>}
          <ErrorLine message={error} />
        </div>
      )}
    </Block>
  );
};

const ExportBlock: React.FC<{ disabled: boolean; hasFrames: boolean }> = ({ disabled, hasFrames }) => {
  const initial = useMemo(() => loadAgencyBranding(), []);
  const [eventName, setEventName] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [date, setDate] = useState(todayIso);
  const [agencyName, setAgencyName] = useState(initial.agencyName);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(initial.logoDataUrl);
  const [includeAppendix, setIncludeAppendix] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const remember = (name: string, logo: string | null) => saveAgencyBranding({ agencyName: name, logoDataUrl: logo });

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { dataUrl } = await logoFromFile(file);
      setLogoDataUrl(dataUrl);
      remember(agencyName, dataUrl);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That image couldn't be read.");
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const runExport = async () => {
    const state = useStageStore.getState();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const blob = await exportStoryboardPdf({
        sets: state.storyboardSets,
        cover: { eventName, speakerName, date, agencyName, logo: logoDataUrl ? logoBytesFromDataUrl(logoDataUrl) : null },
        roomName: state.roomName,
        includeAppendix,
        primaryScreen: selectPrimaryScreen(state),
      });
      const base = toWinAnsi(eventName.trim() || state.roomName.trim() || 'storyboard').replace(/[\\/:*?"<>|]+/g, '-');
      downloadBlob(blob, `${base} storyboard.pdf`);
      state.clearStoryboard();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The PDF couldn't be created. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Block title="Export PDF">
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="label">Event name</span>
          <input className="input" value={eventName} onChange={(e) => setEventName(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="label">Speaker name</span>
          <input className="input" value={speakerName} onChange={(e) => setSpeakerName(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="label">Date</span>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="label">Agency name</span>
          <input
            className="input"
            value={agencyName}
            onChange={(e) => {
              setAgencyName(e.target.value);
              remember(e.target.value, logoDataUrl);
            }}
          />
        </label>
        <div className="space-y-1">
          <span className="label">Logo</span>
          <div className="flex items-center gap-2">
            {logoDataUrl && <img src={logoDataUrl} alt="Logo preview" className="h-10 max-w-[8rem] object-contain bg-ground border border-ink/20 p-1" />}
            <button className="btn btn-secondary" onClick={() => fileInput.current?.click()}>
              {logoDataUrl ? 'Change logo' : 'Choose logo'}
            </button>
            {logoDataUrl && (
              <button
                className="text-[11px] underline text-ink/60 hover:text-ink"
                onClick={() => {
                  setLogoDataUrl(null);
                  remember(agencyName, null);
                }}
              >
                Remove
              </button>
            )}
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => void pickLogo(e.target.files?.[0])} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={includeAppendix} onChange={(e) => setIncludeAppendix(e.target.checked)} />
          Include technical appendix
        </label>
      </div>
      <button className="btn btn-primary w-full py-2" disabled={disabled || busy || !hasFrames} onClick={() => void runExport()}>
        {busy ? 'Exporting…' : 'Export PDF'}
      </button>
      <p className="text-[11px] text-ink/60">
        Exporting clears the frames. The PDF uses standard fonts, so characters outside Western European alphabets are left out.
      </p>
      <ErrorLine message={error} />
      {done && <p role="status" className="text-[11px] text-signal-go">PDF exported. Frames cleared.</p>}
    </Block>
  );
};

export const StoryboardTray: React.FC = () => {
  const sets = useStageStore((s) => s.storyboardSets);
  const isCapturing = useStageStore((s) => s.isCapturing);
  const setIsStoryboardOpen = useStageStore((s) => s.setIsStoryboardOpen);
  const venueSource = useStageStore((s) => s.venueSource);
  const customSeatViews = useStageStore((s) => s.customSeatViews);
  const screens = useStageStore((s) => s.screens);
  const primaryScreenId = useStageStore((s) => s.primaryScreenId);
  const extras = useStageStore((s) => s.storyboardExtraShots);
  const openFloorPlanToPlaceViews = useStageStore((s) => s.openFloorPlanToPlaceViews);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<StoryboardFrame | null>(null);
  const askedPresenter = useRef(false);

  const shotCount = useMemo(
    () => storyboardShots({ venueSource, customSeatViews, screens, primaryScreenId, storyboardExtraShots: extras }, SEAT_PRESETS).length,
    [venueSource, customSeatViews, screens, primaryScreenId, extras],
  );
  const noViews = venueSource === 'custom-glb' && shotCount === 0;
  const frameCount = sets.reduce((n, s) => n + s.frames.length, 0);
  const labelValue = label ?? nextSetLabel(sets.length);

  // The zoomed frame may be deleted or the storyboard cleared underneath the lightbox
  const zoomedFrame = zoomed && sets.some((s) => s.frames.some((f) => f.id === zoomed.id)) ? zoomed : null;

  const close = () => {
    if (frameCount > 0 && !window.confirm('Close the storyboard? Its frames will be discarded.')) return;
    setIsStoryboardOpen(false);
  };

  const capture = async () => {
    setError(null);
    const state = useStageStore.getState();
    const warnings = captureWarnings(state);
    if (warnings.noSource && !window.confirm(`${warnings.noSource} Capture anyway?`)) return;
    if (warnings.presenterOff && !askedPresenter.current) {
      askedPresenter.current = true;
      if (window.confirm('Switch the presenters on? People in shot make the scale readable.')) {
        state.setShowPresenter(true);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    const result = await useStageStore.getState().captureStoryboardSet(labelValue.trim() || nextSetLabel(sets.length));
    if (result.ok) setLabel(null);
    else setError(result.message);
  };

  const captureView = async () => {
    setError(null);
    const result = await useStageStore.getState().captureCurrentViewFrame(sets.length ? sets[sets.length - 1].id : null);
    if (!result.ok) setError(result.message);
  };

  const retake = async (setId: string, frameId: string) => {
    setError(null);
    const result = await useStageStore.getState().retakeStoryboardFrame(setId, frameId);
    if (!result.ok) setError(result.message);
  };

  return (
    <aside className="panel absolute right-3 top-16 bottom-3 w-[23rem] max-w-[calc(100vw-1.5rem)] z-20 flex flex-col overflow-hidden" aria-label="Storyboard">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-ink/20">
        <span className="flex items-center gap-2 text-sm font-extrabold">
          <Clapperboard size={16} /> Storyboard
        </span>
        <button className="btn btn-ghost btn-icon" onClick={close} aria-label="Close storyboard" title="Close storyboard">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Block title="Capture" meta={`${shotCount} ${shotCount === 1 ? 'shot' : 'shots'} per set`}>
          {noViews ? (
            <div className="space-y-2">
              <p className="text-[11px] text-ink/60">This venue has no camera views placed yet, so there is nothing to capture. Place at least one on the floor plan.</p>
              <button className="btn btn-secondary w-full" onClick={openFloorPlanToPlaceViews}>
                <MapIcon size={14} /> Open floor plan to place views
              </button>
            </div>
          ) : (
            <label className="block space-y-1">
              <span className="label">Next set name</span>
              <input className="input" value={labelValue} disabled={isCapturing} onChange={(e) => setLabel(e.target.value)} />
            </label>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1 py-2" disabled={isCapturing || noViews} onClick={() => void capture()}>
              {isCapturing ? 'Capturing…' : 'Capture storyboard'}
            </button>
            <button className="btn btn-secondary py-2" disabled={isCapturing} onClick={() => void captureView()} title="Add the current camera view to the last set">
              <Camera size={14} /> Capture this view
            </button>
          </div>
          <p className="text-[11px] text-ink/60">Change content or move around between captures to compare versions.</p>
          <ErrorLine message={error} />
        </Block>

        {sets.length > 0 && (
          <Block title="Review" meta={`${frameCount} ${frameCount === 1 ? 'frame' : 'frames'}`}>
            <div className="space-y-4">
              {sets.map((set) => (
                <SetReview key={set.id} set={set} disabled={isCapturing} onRetake={(a, b) => void retake(a, b)} onZoom={setZoomed} />
              ))}
            </div>
          </Block>
        )}

        <ExtraShots disabled={isCapturing} />
        <ExportBlock disabled={isCapturing} hasFrames={frameCount > 0} />
      </div>

      {zoomedFrame && <Lightbox frame={zoomedFrame} onClose={() => setZoomed(null)} />}
    </aside>
  );
};

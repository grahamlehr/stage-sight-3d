import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Layers,
  Monitor,
  Building,
  Theater,
  Upload,
  Video,
  Share2,
  Grid,
  FileText,
  User,
  Sliders,
  Move,
  MousePointer,
  Star,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
  Users,
  Mic,
  Map as MapIcon,
} from 'lucide-react';
import {
  useStageStore,
  selectSelectedScreen,
  ASPECT_RATIO_PRESETS,
  UvCropMode,
  type SidebarTab,
} from '../../store/useStageStore';
import { orderSplitScreens } from '../../utils/screenLayout';
import {
  rasterizePdf,
  rasterizeImageFile,
  generateSampleExecutiveDeck,
} from '../../utils/pdfRasterizer';
import { Switch } from './Switch';
import { NoticeBanner } from './NoticeBanner';

// Sections are divided by rules rather than boxed, after the CueSmith grid.
const Section: React.FC<{ title: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  meta,
  children,
}) => (
  <section className="space-y-2.5 pt-4 border-t border-ink/20 first:pt-0 first:border-t-0">
    <div className="flex items-center justify-between gap-2">
      <span className="label flex items-center gap-1.5">{title}</span>
      {meta && <span className="text-[10px] text-ink/60">{meta}</span>}
    </div>
    {children}
  </section>
);

const SliderRow: React.FC<
  { label?: string; value: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
      inputValue: number;
    }
> = ({ label, value, inputValue, ...inputProps }) => (
  <div>
    <div className="flex justify-between text-[11px] text-ink/60 mb-1">
      <span>{label}</span>
      <span className="ml-auto font-extrabold text-ink tabular-nums">{value}</span>
    </div>
    <input type="range" value={inputValue} {...inputProps} />
  </div>
);

/** Name field that commits on Enter or blur, and reverts on Escape. Keyed on the name so it resets when the store changes it. */
const ScreenNameInput: React.FC<{ name: string; onCommit: (name: string) => void }> = ({ name, onCommit }) => (
  <input
    key={name}
    type="text"
    defaultValue={name}
    aria-label="Screen name"
    maxLength={40}
    onBlur={(e) => {
      const trimmed = e.currentTarget.value.trim();
      if (trimmed && trimmed !== name) onCommit(trimmed);
      else e.currentTarget.value = name;
    }}
    onKeyDown={(e) => {
      if (e.key === 'Enter') e.currentTarget.blur();
      else if (e.key === 'Escape') {
        e.currentTarget.value = name;
        e.currentTarget.blur();
      }
    }}
    onClick={(e) => e.stopPropagation()}
    className="input min-w-0 flex-1 font-semibold"
  />
);


export const Sidebar: React.FC = () => {
  const isSidebarOpen = useStageStore((s) => s.isSidebarOpen);
  const activeSidebarTab = useStageStore((s) => s.activeSidebarTab);
  const setActiveSidebarTab = useStageStore((s) => s.setActiveSidebarTab);
  const showNotice = useStageStore((s) => s.showNotice);
  const clearNotice = useStageStore((s) => s.clearNotice);

  // Store slices
  const sourceType = useStageStore((s) => s.sourceType);
  const setSourceType = useStageStore((s) => s.setSourceType);
  const slideCount = useStageStore((s) => s.slides.length);
  const contentLabel = useStageStore((s) => s.contentLabel);
  const setSlides = useStageStore((s) => s.setSlides);
  const activeVideoStream = useStageStore((s) => s.activeVideoStream);
  const setActiveVideoStream = useStageStore((s) => s.setActiveVideoStream);
  const selectedVideoDeviceId = useStageStore((s) => s.selectedVideoDeviceId);
  const setSelectedVideoDeviceId = useStageStore((s) => s.setSelectedVideoDeviceId);
  const uvCropMode = useStageStore((s) => s.uvCropMode);
  const setUvCropMode = useStageStore((s) => s.setUvCropMode);
  const manualUvRepeatY = useStageStore((s) => s.manualUvRepeatY);
  const setManualUvRepeatY = useStageStore((s) => s.setManualUvRepeatY);
  const manualUvOffsetY = useStageStore((s) => s.manualUvOffsetY);
  const setManualUvOffsetY = useStageStore((s) => s.setManualUvOffsetY);


  const screens = useStageStore((s) => s.screens);
  const primaryScreenId = useStageStore((s) => s.primaryScreenId);
  const selectedScreenId = useStageStore((s) => s.selectedScreenId);
  const splitOrder = useStageStore((s) => s.splitOrder);
  const demoSideScreens = useStageStore((s) => s.demoSideScreens);
  const selectedScreenName = useStageStore((s) => selectSelectedScreen(s).name);
  const updateScreen = useStageStore((s) => s.updateScreen);
  const removeScreen = useStageStore((s) => s.removeScreen);
  const setPrimaryScreen = useStageStore((s) => s.setPrimaryScreen);
  const setSelectedScreen = useStageStore((s) => s.setSelectedScreen);
  const setScreenRole = useStageStore((s) => s.setScreenRole);
  const setAllScreenRoles = useStageStore((s) => s.setAllScreenRoles);
  const moveScreenInSplit = useStageStore((s) => s.moveScreenInSplit);
  const resetSplitOrder = useStageStore((s) => s.resetSplitOrder);
  const setDemoSideScreens = useStageStore((s) => s.setDemoSideScreens);
  const screenWidth = useStageStore((s) => selectSelectedScreen(s).width);
  const screenHeight = useStageStore((s) => selectSelectedScreen(s).height);
  const setScreenDimensions = useStageStore((s) => s.setScreenDimensions);
  const setScreenPreset = useStageStore((s) => s.setScreenPreset);
  const showTransformGizmo = useStageStore((s) => s.showTransformGizmo);
  const setShowTransformGizmo = useStageStore((s) => s.setShowTransformGizmo);
  const isPickingMesh = useStageStore((s) => s.isPickingMesh);
  const setIsPickingMesh = useStageStore((s) => s.setIsPickingMesh);

  // 3 Occlusion Test Items
  const showPresenter = useStageStore((s) => s.showPresenter);
  const setShowPresenter = useStageStore((s) => s.setShowPresenter);
  const presenterOffset = useStageStore((s) => s.presenterOffset);
  const setPresenterOffset = useStageStore((s) => s.setPresenterOffset);

  const showLectern = useStageStore((s) => s.showLectern);
  const setShowLectern = useStageStore((s) => s.setShowLectern);
  const lecternOffset = useStageStore((s) => s.lecternOffset);
  const setLecternOffset = useStageStore((s) => s.setLecternOffset);

  const showPanel = useStageStore((s) => s.showPanel);
  const setShowPanel = useStageStore((s) => s.setShowPanel);
  const panelOffset = useStageStore((s) => s.panelOffset);
  const setPanelOffset = useStageStore((s) => s.setPanelOffset);

  const venueSource = useStageStore((s) => s.venueSource);
  const splitScreens = useMemo(() => orderSplitScreens(screens, splitOrder), [screens, splitOrder]);
  const splitTotalWidth = splitScreens.reduce((sum, sc) => sum + sc.width, 0) || 1;
  const hasBoundScreen = screens.some((sc) => sc.boundMeshName);
  const setVenueSource = useStageStore((s) => s.setVenueSource);
  const setCustomGlbUrl = useStageStore((s) => s.setCustomGlbUrl);
  const venueYaw = useStageStore((s) => s.venueYaw);
  const setVenueYaw = useStageStore((s) => s.setVenueYaw);
  const openFloorPlanToPlaceViews = useStageStore((s) => s.openFloorPlanToPlaceViews);
  const customVenueBounds = useStageStore((s) => s.customVenueBounds);
  const customDeckHeight = useStageStore((s) => s.customDeckHeight);
  const setCustomDeckHeight = useStageStore((s) => s.setCustomDeckHeight);
  const stageHeight = useStageStore((s) => s.stageHeight);
  const setStageHeight = useStageStore((s) => s.setStageHeight);
  const venueLength = useStageStore((s) => s.venueLength);
  const venueWidth = useStageStore((s) => s.venueWidth);
  const setVenueDimensions = useStageStore((s) => s.setVenueDimensions);
  const showCeilingFixtures = useStageStore((s) => s.showCeilingFixtures);
  const setShowCeilingFixtures = useStageStore((s) => s.setShowCeilingFixtures);

  // Local UI State
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [isRasterizing, setIsRasterizing] = useState(false);
  const [rasterProgress, setRasterProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const glbInputRef = useRef<HTMLInputElement>(null);

  // Enumerate video capture devices
  const refreshDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedVideoDeviceId) {
          setSelectedVideoDeviceId(videoInputs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Unable to enumerate video devices:', err);
    }
  }, [selectedVideoDeviceId, setSelectedVideoDeviceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with an external system: the device list comes from an async browser API, not from render inputs
    refreshDevices();
  }, [refreshDevices]);


  // Handle PDF / Image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    clearNotice();
    try {
      setIsRasterizing(true);
      if (file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        const canvases = await rasterizePdf(buffer, (cur, tot) => {
          setRasterProgress({ current: cur, total: tot });
        });
        setSlides(canvases, file.name);
        setSourceType('pdf');
      } else if (file.type.startsWith('image/')) {
        const canvas = await rasterizeImageFile(file);
        setSlides([canvas], file.name);
        setSourceType('pdf');
      }
    } catch (err) {
      console.error('File rasterization error:', err);
      showNotice({
        tone: 'error',
        area: 'content',
        text: "That file couldn't be read. Check that it is a valid PDF, PNG or JPEG.",
      });
    } finally {
      setIsRasterizing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load 5-slide 32:9 sample executive deck
  const handleLoadSampleDeck = () => {
    const deck = generateSampleExecutiveDeck();
    setSlides(deck, 'Sample deck');
    setSourceType('pdf');
  };

  // Connect USB HDMI Capture Card via getUserMedia (requesting 4K/1080p60)
  const handleStartCaptureCard = async () => {
    clearNotice();
    try {
      if (activeVideoStream) {
        activeVideoStream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedVideoDeviceId ? { exact: selectedVideoDeviceId } : undefined,
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 60 },
        },
        audio: false,
      });

      setActiveVideoStream(stream);
      setSourceType('hdmi-capture');
    } catch (err) {
      console.error('Error connecting to HDMI capture card:', err);
      showNotice({
        tone: 'error',
        area: 'content',
        text: "Couldn't open the capture device. Check the browser's camera permission and that the capture card is plugged in.",
      });
    }
  };

  // Connect Local Window / Screen Share
  const handleStartScreenShare = async () => {
    try {
      if (activeVideoStream) {
        activeVideoStream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
      });

      setActiveVideoStream(stream);
      setSourceType('screen-share');

      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        setActiveVideoStream(null);
        setSourceType('test-pattern');
      };
    } catch (err) {
      console.error('Screen sharing canceled or failed:', err);
    }
  };

  // Handle Custom GLB Upload
  const handleGlbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomGlbUrl(url);
    setVenueSource('custom-glb');
  };

  if (!isSidebarOpen) return null;

  const isLiveFeed =
    activeVideoStream !== null && (sourceType === 'hdmi-capture' || sourceType === 'screen-share');
  const hasSlides = slideCount > 0;

  const tabs = [
    { id: 'venue', label: 'Venue', icon: Building },
    { id: 'screens', label: 'Screens', icon: Monitor },
    { id: 'stage', label: 'Stage', icon: Theater },
    { id: 'content', label: 'Content', icon: Layers },
  ] as const satisfies readonly { id: SidebarTab; label: string; icon: unknown }[];

  const sourceTiles = [
    { id: 'test-pattern', label: 'Test pattern', sub: 'Grid, rulers and text sizes', icon: Grid },
    {
      id: 'pdf',
      label: 'PDF / Image',
      sub: !hasSlides ? 'Upload a deck or image' : sourceType === 'pdf' ? 'Slides on screen' : 'Back to slides',
      icon: FileText,
    },
    { id: 'hdmi-capture', label: 'HDMI capture', sub: 'USB capture card', icon: Video },
    { id: 'screen-share', label: 'Screen share', sub: 'A window or whole screen', icon: Share2 },
  ] as const;

  const handleSourceTile = (id: (typeof sourceTiles)[number]['id']) => {
    if (id === 'test-pattern') setSourceType('test-pattern');
    else if (id === 'pdf') {
      // Slides stay loaded while another source is showing, so go back to them rather than asking again
      if (hasSlides && sourceType !== 'pdf') setSourceType('pdf');
      else if (!hasSlides) fileInputRef.current?.click();
    } else if (id === 'hdmi-capture') void handleStartCaptureCard();
    else void handleStartScreenShare();
  };

  // Arrow keys, Home and End move between tabs (local to the tablist, so the slide transport never sees them)
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const current = tabs.findIndex((t) => t.id === activeSidebarTab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveSidebarTab(tabs[next].id);
    document.getElementById(`sidebar-tab-${tabs[next].id}`)?.focus();
  };

  // What the screens are showing now, for the status row at the top of the Content tab
  const nowShowing =
    sourceType === 'test-pattern'
      ? 'Test pattern'
      : sourceType === 'hdmi-capture'
      ? 'HDMI capture'
      : sourceType === 'screen-share'
      ? 'Screen share'
      : contentLabel ?? 'Slides';
  const nowShowingMeta =
    sourceType === 'pdf' ? `${slideCount} ${slideCount === 1 ? 'slide' : 'slides'}` : null;

  return (
    <aside
      data-guide="sidebar"
      className="panel absolute left-3 top-16 bottom-16 w-[21rem] sm:w-[23rem] z-20 flex flex-col overflow-hidden">
      {/* Sidebar Tabs: numbered in setup order */}
      <div
        role="tablist"
        aria-label="Sidebar sections"
        onKeyDown={handleTabKeyDown}
        className="grid grid-cols-4 border-b-2 border-ink/20">
        {tabs.map(({ id, label, icon: Icon }, i) => (
          <button
            key={id}
            role="tab"
            id={`sidebar-tab-${id}`}
            aria-controls="sidebar-tabpanel"
            aria-selected={activeSidebarTab === id}
            tabIndex={activeSidebarTab === id ? 0 : -1}
            onClick={() => setActiveSidebarTab(id)}
            className={`flex items-center justify-center gap-1 px-1 py-2.5 -mb-[2px] border-b-2 text-xs transition ${
              activeSidebarTab === id
                ? 'border-ink text-ink font-extrabold'
                : 'border-transparent text-ink/60 hover:text-ink'
            }`}
          >
            <Icon size={14} className="hidden sm:block flex-none" />
            <span className="text-[10px] font-normal tabular-nums opacity-60">{i + 1}</span>
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Container */}
      <div
        role="tabpanel"
        id="sidebar-tabpanel"
        aria-labelledby={`sidebar-tab-${activeSidebarTab}`}
        className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ================= TAB 1: VENUE ================= */}
        {activeSidebarTab === 'venue' && (
          <>
            <Section title="Venue source">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVenueSource('default-ballroom')}
                  aria-pressed={venueSource === 'default-ballroom'}
                  className="option justify-center"
                >
                  Demo ballroom
                </button>
                <button
                  onClick={() => glbInputRef.current?.click()}
                  aria-pressed={venueSource === 'custom-glb'}
                  className="option justify-center"
                >
                  Upload .glb file
                </button>
                <input
                  ref={glbInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  className="hidden"
                  onChange={handleGlbUpload}
                />
              </div>
            </Section>

            {venueSource === 'default-ballroom' ? (
              <>
                <Section title="Room size">
                  <SliderRow
                    label="Length (depth)"
                    value={`${venueLength}m`}
                    min="15"
                    max="60"
                    step="1"
                    inputValue={venueLength}
                    onChange={(e) => setVenueDimensions(venueWidth, parseInt(e.target.value, 10))}
                  />
                  <SliderRow
                    label="Width"
                    value={`${venueWidth}m`}
                    min="12"
                    max="45"
                    step="1"
                    inputValue={venueWidth}
                    onChange={(e) => setVenueDimensions(parseInt(e.target.value, 10), venueLength)}
                  />
                </Section>

                <Section title="Ceiling">
                  <Switch
                    label="Ceiling lighting trusses"
                    checked={showCeilingFixtures}
                    onChange={setShowCeilingFixtures}
                  />
                </Section>
              </>
            ) : (
              <Section title="Custom venue">
                <div className="flex items-start gap-2.5">
                  <Upload size={18} strokeWidth={1.5} className="text-ink/60 flex-none mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Custom venue loaded</p>
                    <p className="text-[10px] text-ink/60">
                      Next, pick the screen mesh on the Screens tab. Shift + click the floor to sit anywhere.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-ink/60">
                    Rotation: turn the model until its screen wall faces the audience. Picking the screen mesh
                    does this for you.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        onClick={() => setVenueYaw((deg * Math.PI) / 180)}
                        aria-pressed={Math.round((venueYaw * 180) / Math.PI) === deg}
                        className="option justify-center"
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 pt-2.5 border-t border-ink/[0.12]">
                  <button
                    onClick={openFloorPlanToPlaceViews}
                    disabled={!customVenueBounds}
                    className="btn btn-secondary w-full justify-center disabled:opacity-50"
                  >
                    <MapIcon size={14} />
                    Place camera views
                  </button>
                  {!customVenueBounds && (
                    <p className="text-[10px] text-ink/60">The model is still loading.</p>
                  )}
                </div>
                <button onClick={() => glbInputRef.current?.click()} className="btn btn-secondary">
                  Change .glb file
                </button>
              </Section>
            )}
          </>
        )}

        {/* ================= TAB 2: SCREENS ================= */}
        {activeSidebarTab === 'screens' && (
          <>
            <Section title="Screens" meta={`${screens.length} in the room`}>
              <ul className="space-y-1.5">
                {screens.map((screen) => {
                  const isSelected = screen.id === selectedScreenId;
                  const isPrimary = screen.id === primaryScreenId;
                  return (
                    <li
                      key={screen.id}
                      onClick={() => setSelectedScreen(screen.id)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`space-y-1.5 p-2 border cursor-pointer ${
                        isSelected ? 'border-ink bg-ink/[0.07]' : 'border-ink/20 hover:border-ink/45'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryScreen(screen.id);
                          }}
                          aria-pressed={isPrimary}
                          title={isPrimary ? 'Primary screen: the telemetry reads from it' : 'Make this the primary screen'}
                          aria-label={isPrimary ? 'Primary screen' : `Make ${screen.name} the primary screen`}
                          className="btn btn-ghost btn-icon flex-none"
                        >
                          <Star size={14} fill={isPrimary ? 'currentColor' : 'none'} />
                        </button>
                        <ScreenNameInput name={screen.name} onCommit={(name) => updateScreen(screen.id, { name })} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeScreen(screen.id);
                          }}
                          disabled={screens.length <= 1}
                          title={screens.length <= 1 ? 'There must be at least one screen' : 'Remove this screen'}
                          aria-label={`Remove ${screen.name}`}
                          className="btn btn-ghost btn-icon flex-none"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="seg" role="group" aria-label={`${screen.name} role`} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="seg-opt"
                            aria-pressed={screen.role === 'split'}
                            onClick={() => setScreenRole(screen.id, 'split')}
                            title="Shows its own slice of the source"
                          >
                            Split
                          </button>
                          <button
                            className="seg-opt"
                            aria-pressed={screen.role === 'repeat'}
                            onClick={() => setScreenRole(screen.id, 'repeat')}
                            title="Shows the whole source"
                          >
                            Repeat
                          </button>
                        </div>
                        <span className="flex items-center gap-1.5 min-w-0">
                          {isPrimary && <span className="tag tag-outline">Primary</span>}
                          {screen.boundMeshName && (
                            <span className="tag tag-outline truncate max-w-[110px]" title={`Bound to mesh ${screen.boundMeshName}`}>
                              {screen.boundMeshName}
                            </span>
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {screens.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setAllScreenRoles('repeat')} className="btn btn-secondary">
                    Repeat on all
                  </button>
                  <button onClick={() => setAllScreenRoles('split')} className="btn btn-secondary">
                    Split across all
                  </button>
                </div>
              )}

              {venueSource === 'default-ballroom' && (
                <Switch
                  label="Side screens"
                  icon={<Monitor size={14} />}
                  checked={demoSideScreens}
                  onChange={setDemoSideScreens}
                />
              )}
            </Section>

            {splitScreens.length >= 2 && (
              <Section
                title="Split order"
                meta={splitOrder ? 'Manual' : 'Auto: left to right'}
              >
                <ol className="space-y-1">
                  {splitScreens.map((screen, i) => (
                    <li key={screen.id} className="flex items-center gap-1.5 text-xs">
                      <span className="tabular-nums text-ink/60 w-4">{i + 1}</span>
                      <span className="flex-1 truncate font-semibold">{screen.name}</span>
                      <button
                        onClick={() => moveScreenInSplit(screen.id, -1)}
                        disabled={i === 0}
                        aria-label={`Move ${screen.name} left`}
                        title="Move left"
                        className="btn btn-ghost btn-icon"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={() => moveScreenInSplit(screen.id, 1)}
                        disabled={i === splitScreens.length - 1}
                        aria-label={`Move ${screen.name} right`}
                        title="Move right"
                        className="btn btn-ghost btn-icon"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </li>
                  ))}
                </ol>
                {splitOrder && (
                  <button onClick={resetSplitOrder} className="btn btn-secondary w-full">
                    Auto order
                  </button>
                )}
                <div>
                  <div className="flex gap-px h-9" aria-label="How the source is sliced across the split screens">
                    {splitScreens.map((screen) => (
                      <div
                        key={screen.id}
                        style={{ flexGrow: screen.width, flexBasis: 0 }}
                        className="min-w-0 flex flex-col items-center justify-center bg-ink/[0.12] border border-ink/30 text-[10px] leading-tight overflow-hidden"
                        title={`${screen.name}: ${Math.round((screen.width / splitTotalWidth) * 100)}% of the source width`}
                      >
                        <span className="truncate max-w-full px-1 font-semibold">{screen.name}</span>
                        <span className="tabular-nums text-ink/60">
                          {Math.round((screen.width / splitTotalWidth) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-ink/60 mt-1">
                    Each split screen shows a slice of the source as wide as the screen is.
                  </p>
                </div>
              </Section>
            )}

            {/* Detail: the screen picked in the list above */}
            <section className="space-y-4 p-3 border border-ink/30 bg-ink/[0.04]">
              <span className="label block truncate" title={selectedScreenName}>
                {selectedScreenName}
              </span>
              <Section title="Aspect ratio">
                <div className="space-y-1">
                  {ASPECT_RATIO_PRESETS.map((p) => {
                    const isSelected =
                      Math.abs(screenWidth - p.width) < 0.05 &&
                      Math.abs(screenHeight - p.height) < 0.05;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setScreenPreset(p.id)}
                        aria-pressed={isSelected}
                        className="option w-full justify-between p-2"
                      >
                        <span>{p.label}</span>
                        <span className="text-[11px] tabular-nums opacity-70">
                          {p.width}m × {p.height}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Manual Dimensions Input */}
              <Section title="Size (metres)">
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="text-[10px] text-ink/60 block mb-1">Width (m)</span>
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      max="50"
                      value={screenWidth}
                      onChange={(e) =>
                        setScreenDimensions(Math.max(1, parseFloat(e.target.value) || 1), screenHeight)
                      }
                      className="input"
                    />
                  </label>
                  <label>
                    <span className="text-[10px] text-ink/60 block mb-1">Height (m)</span>
                    <input
                      type="number"
                      step="0.25"
                      min="1"
                      max="20"
                      value={screenHeight}
                      onChange={(e) =>
                        setScreenDimensions(screenWidth, Math.max(1, parseFloat(e.target.value) || 1))
                      }
                      className="input"
                    />
                  </label>
                </div>
              </Section>

              <Section title="Placement">
                <Switch
                  label="3D transform gizmo"
                  icon={<Move size={14} />}
                  checked={showTransformGizmo}
                  onChange={setShowTransformGizmo}
                />

                {venueSource === 'custom-glb' && (
                  <div className="space-y-1">
                    <button
                      onClick={() => setIsPickingMesh(!isPickingMesh)}
                      data-state={isPickingMesh ? 'standby' : undefined}
                      className="option w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <MousePointer size={15} />
                        {isPickingMesh
                          ? 'Click a mesh in the 3D view…'
                          : hasBoundScreen
                          ? 'Add screen from mesh'
                          : 'Pick screen mesh'}
                      </span>
                      {isPickingMesh && <span className="tag tag-outline">Stby</span>}
                    </button>
                    <p className="text-[10px] text-ink/60">Shift-click to add several.</p>
                  </div>
                )}
              </Section>
            </section>
          </>
        )}

        {/* ================= TAB 3: STAGE ================= */}
        {activeSidebarTab === 'stage' && (
          <>
            <Section title="Stage height">
              {venueSource === 'custom-glb' ? (
                <div className="space-y-1">
                  <SliderRow
                    value={`${customDeckHeight.toFixed(2)}m`}
                    min="0"
                    max="3"
                    step="0.05"
                    inputValue={customDeckHeight}
                    onChange={(e) => setCustomDeckHeight(parseFloat(e.target.value))}
                  />
                  <p className="text-[10px] text-ink/60">
                    Where the props stand. Picking a screen mesh sets this from the stage in front of it.
                  </p>
                </div>
              ) : (
                <SliderRow
                  value={`${stageHeight.toFixed(2)}m`}
                  min="0.3"
                  max="2.5"
                  step="0.05"
                  inputValue={stageHeight}
                  onChange={(e) => setStageHeight(parseFloat(e.target.value))}
                />
              )}
            </Section>

            {/* ================= 3 Stage Occlusion Test Items ================= */}
            <Section title="Stage props">
              {/* 1. Presenters (Two Standing People) */}
              <div className="space-y-2.5">
                <Switch
                  label="Presenters (1.8m, 1.68m)"
                  icon={<User size={14} strokeWidth={1.5} />}
                  checked={showPresenter}
                  onChange={setShowPresenter}
                />

                {showPresenter && (
                  <div className="space-y-2.5 pl-5">
                    <SliderRow
                      label="Lateral position (X)"
                      value={`${presenterOffset[0].toFixed(1)}m`}
                      min="-7.5"
                      max="7.5"
                      step="0.1"
                      inputValue={presenterOffset[0]}
                      onChange={(e) =>
                        setPresenterOffset([parseFloat(e.target.value), presenterOffset[1]])
                      }
                    />
                    <SliderRow
                      label="Distance in front (Z)"
                      value={`${presenterOffset[1].toFixed(1)}m`}
                      min="0.5"
                      max="4.5"
                      step="0.1"
                      inputValue={presenterOffset[1]}
                      onChange={(e) =>
                        setPresenterOffset([presenterOffset[0], parseFloat(e.target.value)])
                      }
                    />
                  </div>
                )}
              </div>

              {/* 2. Lectern / Podium */}
              <div className="space-y-2.5 pt-2.5 border-t border-ink/[0.12]">
                <Switch
                  label="Lectern / podium (1.15m)"
                  icon={<Mic size={14} strokeWidth={1.5} />}
                  checked={showLectern}
                  onChange={setShowLectern}
                />

                {showLectern && (
                  <div className="space-y-2.5 pl-5">
                    <SliderRow
                      label="Lateral position (X)"
                      value={`${lecternOffset[0].toFixed(1)}m`}
                      min="-7.5"
                      max="7.5"
                      step="0.1"
                      inputValue={lecternOffset[0]}
                      onChange={(e) =>
                        setLecternOffset([parseFloat(e.target.value), lecternOffset[1]])
                      }
                    />
                    <SliderRow
                      label="Distance in front (Z)"
                      value={`${lecternOffset[1].toFixed(1)}m`}
                      min="0.5"
                      max="4.5"
                      step="0.1"
                      inputValue={lecternOffset[1]}
                      onChange={(e) =>
                        setLecternOffset([lecternOffset[0], parseFloat(e.target.value)])
                      }
                    />
                  </div>
                )}
              </div>

              {/* 3. Four-Person Panel in Tub Chairs */}
              <div className="space-y-2.5 pt-2.5 border-t border-ink/[0.12]">
                <Switch
                  label="Four-person panel (tub chairs)"
                  icon={<Users size={14} strokeWidth={1.5} />}
                  checked={showPanel}
                  onChange={setShowPanel}
                />

                {showPanel && (
                  <div className="space-y-2.5 pl-5">
                    <SliderRow
                      label="Centre position (X)"
                      value={`${panelOffset[0].toFixed(1)}m`}
                      min="-5.0"
                      max="5.0"
                      step="0.1"
                      inputValue={panelOffset[0]}
                      onChange={(e) =>
                        setPanelOffset([parseFloat(e.target.value), panelOffset[1]])
                      }
                    />
                    <SliderRow
                      label="Distance in front (Z)"
                      value={`${panelOffset[1].toFixed(1)}m`}
                      min="1.0"
                      max="4.5"
                      step="0.1"
                      inputValue={panelOffset[1]}
                      onChange={(e) =>
                        setPanelOffset([panelOffset[0], parseFloat(e.target.value)])
                      }
                    />
                  </div>
                )}
              </div>
            </Section>
          </>
        )}

        {/* ================= TAB 4: CONTENT ================= */}
        {activeSidebarTab === 'content' && (
          <>
            <NoticeBanner area="content" />

            {/* Now showing status row */}
            <div className="flex items-center justify-between gap-2 p-2.5 border border-ink/20 bg-ink/[0.04]">
              <div className="min-w-0">
                <div className="label">Now showing</div>
                <div className="text-xs font-semibold truncate" title={nowShowing}>
                  {nowShowing}
                  {nowShowingMeta && (
                    <span className="font-normal text-ink/60 tabular-nums"> · {nowShowingMeta}</span>
                  )}
                </div>
              </div>
              {isLiveFeed && <span className="tag tag-live flex-none">Live</span>}
            </div>

            <Section title="Source">
              <div className="grid grid-cols-2 gap-2">
                {sourceTiles.map(({ id, label, sub, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleSourceTile(id)}
                    aria-pressed={sourceType === id}
                    className="option"
                  >
                    <Icon size={16} strokeWidth={1.5} className="flex-none" />
                    <div className="min-w-0">
                      <div className="text-xs">{label}</div>
                      <div className="text-[10px] font-normal opacity-70">{sub}</div>
                    </div>
                    {isLiveFeed && sourceType === id && <span className="tag tag-live ml-auto">Live</span>}
                  </button>
                ))}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <button onClick={handleLoadSampleDeck} className="underline underline-offset-2 text-ink/70 hover:text-ink">
                  Load the sample 32:9 deck
                </button>
                {hasSlides && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="underline underline-offset-2 text-ink/70 hover:text-ink"
                  >
                    Upload a new file
                  </button>
                )}
              </div>
            </Section>

            {/* Ingestion Progress indicator */}
            {isRasterizing && (
              <div className="p-3 bg-standby border border-ink/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Rasterising slides at 4096px…</span>
                  <span className="tabular-nums">{rasterProgress.current} / {rasterProgress.total}</span>
                </div>
                <div className="w-full h-0.5 bg-ink/20">
                  <div
                    className="h-full bg-ink transition-all duration-200"
                    style={{
                      width: `${(rasterProgress.current / Math.max(1, rasterProgress.total)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* HDMI Capture Device Settings */}
            {sourceType === 'hdmi-capture' && (
              <Section
                title="Video device"
                meta={
                  <button onClick={refreshDevices} className="btn btn-ghost p-1 text-ink/60 hover:text-ink" title="Refresh devices" aria-label="Refresh devices">
                    <RefreshCw size={12} />
                  </button>
                }
              >
                <select
                  value={selectedVideoDeviceId}
                  onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                  className="input"
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </Section>
            )}

            {/* Module D: Reactive 16:9 HDMI Letterbox UV Cropper Controls */}
            {(sourceType === 'hdmi-capture' || sourceType === 'screen-share') && (
              <Section
                title={
                  <>
                    <Sliders size={12} />
                    Fit a 16:9 feed
                  </>
                }
              >
                <p className="text-[10px] text-ink/60">
                  Capture cards send 16:9. The cropper fits that picture to the wide screen.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'auto-letterbox', label: 'Show whole picture' },
                      { id: 'top-aligned', label: 'Align to top' },
                      { id: 'fill-1-to-1', label: 'Stretch to fill' },
                      { id: 'manual', label: 'Custom' },
                    ] as { id: UvCropMode; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setUvCropMode(m.id)}
                      aria-pressed={uvCropMode === m.id}
                      className="option justify-center py-1.5"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {uvCropMode === 'manual' && (
                  <div className="space-y-2.5 pt-2.5 border-t border-ink/[0.12]">
                    <SliderRow
                      label="Height used"
                      value={manualUvRepeatY.toFixed(2)}
                      min="0.1"
                      max="1.0"
                      step="0.01"
                      inputValue={manualUvRepeatY}
                      onChange={(e) => setManualUvRepeatY(parseFloat(e.target.value))}
                    />
                    <SliderRow
                      label="Vertical offset"
                      value={manualUvOffsetY.toFixed(2)}
                      min="0.0"
                      max="0.9"
                      step="0.01"
                      inputValue={manualUvOffsetY}
                      onChange={(e) => setManualUvOffsetY(parseFloat(e.target.value))}
                    />
                  </div>
                )}
              </Section>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

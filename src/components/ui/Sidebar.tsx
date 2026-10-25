import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  Monitor,
  Building,
  Upload,
  Video,
  Share2,
  Grid,
  FileText,
  User,
  Sliders,
  Sparkles,
  Move,
  MousePointer,
  RefreshCw,
  Sun,
  Users,
  Mic,
  Map as MapIcon,
  X,
} from 'lucide-react';
import {
  useStageStore,
  selectSelectedScreen,
  ASPECT_RATIO_PRESETS,
  UvCropMode,
} from '../../store/useStageStore';
import { defaultCutHeight } from '../../utils/floorPlan';
import {
  rasterizePdf,
  rasterizeImageFile,
  generateSampleExecutiveDeck,
} from '../../utils/pdfRasterizer';

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
  { label: string; value: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
      inputValue: number;
    }
> = ({ label, value, inputValue, ...inputProps }) => (
  <div>
    <div className="flex justify-between text-[11px] text-ink/60 mb-1">
      <span>{label}</span>
      <span className="font-extrabold text-ink tabular-nums">{value}</span>
    </div>
    <input type="range" value={inputValue} {...inputProps} />
  </div>
);

export const Sidebar: React.FC = () => {
  const isSidebarOpen = useStageStore((s) => s.isSidebarOpen);
  const activeSidebarTab = useStageStore((s) => s.activeSidebarTab);
  const setActiveSidebarTab = useStageStore((s) => s.setActiveSidebarTab);

  // Store slices
  const sourceType = useStageStore((s) => s.sourceType);
  const setSourceType = useStageStore((s) => s.setSourceType);
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

  const screenWidth = useStageStore((s) => selectSelectedScreen(s).width);
  const screenHeight = useStageStore((s) => selectSelectedScreen(s).height);
  const setScreenDimensions = useStageStore((s) => s.setScreenDimensions);
  const setScreenPreset = useStageStore((s) => s.setScreenPreset);
  const showTransformGizmo = useStageStore((s) => s.showTransformGizmo);
  const setShowTransformGizmo = useStageStore((s) => s.setShowTransformGizmo);
  const isPickingMesh = useStageStore((s) => s.isPickingMesh);
  const setIsPickingMesh = useStageStore((s) => s.setIsPickingMesh);
  const boundMeshName = useStageStore((s) => selectSelectedScreen(s).boundMeshName);

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
  const setVenueSource = useStageStore((s) => s.setVenueSource);
  const setCustomGlbUrl = useStageStore((s) => s.setCustomGlbUrl);
  const venueYaw = useStageStore((s) => s.venueYaw);
  const setVenueYaw = useStageStore((s) => s.setVenueYaw);
  const customSeatViews = useStageStore((s) => s.customSeatViews);
  const setCustomSeatView = useStageStore((s) => s.setCustomSeatView);
  const isFloorPlanOpen = useStageStore((s) => s.isFloorPlanOpen);
  const setIsFloorPlanOpen = useStageStore((s) => s.setIsFloorPlanOpen);
  const floorPlanSlot = useStageStore((s) => s.floorPlanSlot);
  const setFloorPlanSlot = useStageStore((s) => s.setFloorPlanSlot);
  const floorPlanCutHeight = useStageStore((s) => s.floorPlanCutHeight);
  const setFloorPlanCutHeight = useStageStore((s) => s.setFloorPlanCutHeight);
  const customVenueBounds = useStageStore((s) => s.customVenueBounds);
  const customDeckHeight = useStageStore((s) => s.customDeckHeight);
  const setCustomDeckHeight = useStageStore((s) => s.setCustomDeckHeight);
  const stageHeight = useStageStore((s) => s.stageHeight);
  const setStageHeight = useStageStore((s) => s.setStageHeight);
  const venueLength = useStageStore((s) => s.venueLength);
  const venueWidth = useStageStore((s) => s.venueWidth);
  const setVenueDimensions = useStageStore((s) => s.setVenueDimensions);
  const houseLightsIntensity = useStageStore((s) => s.houseLightsIntensity);
  const setHouseLightsIntensity = useStageStore((s) => s.setHouseLightsIntensity);
  const stageLightsIntensity = useStageStore((s) => s.stageLightsIntensity);
  const setStageLightsIntensity = useStageStore((s) => s.setStageLightsIntensity);
  const lightingPreset = useStageStore((s) => s.lightingPreset);
  const setLightingPreset = useStageStore((s) => s.setLightingPreset);
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

    try {
      setIsRasterizing(true);
      if (file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        const canvases = await rasterizePdf(buffer, (cur, tot) => {
          setRasterProgress({ current: cur, total: tot });
        });
        setSlides(canvases);
        setSourceType('pdf');
      } else if (file.type.startsWith('image/')) {
        const canvas = await rasterizeImageFile(file);
        setSlides([canvas]);
        setSourceType('pdf');
      }
    } catch (err) {
      console.error('File rasterization error:', err);
      alert('Failed to parse file. Please verify it is a valid PDF or image file.');
    } finally {
      setIsRasterizing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load 5-slide 32:9 sample executive deck
  const handleLoadSampleDeck = () => {
    const deck = generateSampleExecutiveDeck();
    setSlides(deck);
    setSourceType('pdf');
  };

  // Connect USB HDMI Capture Card via getUserMedia (requesting 4K/1080p60)
  const handleStartCaptureCard = async () => {
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
      alert('Could not access HDMI capture device. Please check permissions or device connection.');
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

  const tabs = [
    { id: 'source', label: 'Source', icon: Layers },
    { id: 'screen', label: 'Screen', icon: Monitor },
    { id: 'venue', label: 'Venue', icon: Building },
  ] as const;

  const sourceTiles = [
    { id: 'test-pattern', label: 'Test Pattern', sub: '4K Rulers & Ladder', icon: Grid },
    { id: 'pdf', label: 'PDF / Image', sub: 'Upload Slide Deck', icon: FileText },
    { id: 'hdmi-capture', label: 'HDMI Capture', sub: 'USB Video In', icon: Video },
    { id: 'screen-share', label: 'Window Share', sub: 'PowerPoint App', icon: Share2 },
  ] as const;

  const handleSourceTile = (id: (typeof sourceTiles)[number]['id']) => {
    if (id === 'test-pattern') setSourceType('test-pattern');
    else if (id === 'pdf') fileInputRef.current?.click();
    else if (id === 'hdmi-capture') void handleStartCaptureCard();
    else void handleStartScreenShare();
  };

  const lightingPresets = [
    { id: 'conference-bright', label: 'Bright' },
    { id: 'ballroom-standard', label: 'Standard' },
    { id: 'keynote-dark', label: 'Dark' },
  ] as const;

  return (
    <aside
      data-guide="sidebar"
      className="panel absolute left-3 top-16 bottom-16 w-[21rem] sm:w-[23rem] z-20 flex flex-col overflow-hidden">
      {/* Sidebar Tabs */}
      <div role="tablist" className="grid grid-cols-3 border-b-2 border-ink/20">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeSidebarTab === id}
            onClick={() => setActiveSidebarTab(id)}
            className={`flex items-center justify-center gap-1.5 py-2.5 -mb-[2px] border-b-2 text-xs transition ${
              activeSidebarTab === id
                ? 'border-ink text-ink font-extrabold'
                : 'border-transparent text-ink/60 hover:text-ink'
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* ================= TAB 1: CONTENT SOURCE ================= */}
        {activeSidebarTab === 'source' && (
          <>
            <Section title="Active Content Feed">
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
            </Section>

            {/* Quick Demo Deck Button */}
            <Section title="Instant Demo Deck" meta={<Sparkles size={13} />}>
              <p className="text-[11px] text-ink/60">
                Load 5 procedural 32:9 executive slides (Keynote, Clinical Data, Pipeline, Financials, Q&A) for immediate testing.
              </p>
              <button onClick={handleLoadSampleDeck} className="btn btn-primary w-full py-2">
                Load Sample 32:9 Executive Deck (5 Slides)
              </button>
            </Section>

            {/* Ingestion Progress indicator */}
            {isRasterizing && (
              <div className="p-3 bg-standby border border-ink/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Rasterizing slides at 4096px...</span>
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
                title="Video Device"
                meta={
                  <button onClick={refreshDevices} className="btn btn-ghost p-1 text-ink/60 hover:text-ink" title="Refresh Devices">
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
                    Ultra-Wide Letterbox Cropper
                  </>
                }
                meta="16:9 EDID Fix"
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'auto-letterbox', label: 'Centered (Show)' },
                      { id: 'top-aligned', label: 'Top-Aligned' },
                      { id: 'fill-1-to-1', label: 'Fill 1-to-1' },
                      { id: 'manual', label: 'Manual' },
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
                      label="Repeat Y (Height Crop)"
                      value={manualUvRepeatY.toFixed(2)}
                      min="0.1"
                      max="1.0"
                      step="0.01"
                      inputValue={manualUvRepeatY}
                      onChange={(e) => setManualUvRepeatY(parseFloat(e.target.value))}
                    />
                    <SliderRow
                      label="Offset Y (Vertical Shift)"
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

        {/* ================= TAB 2: SCREEN & STAGE ================= */}
        {activeSidebarTab === 'screen' && (
          <>
            <Section title="Aspect Ratio Presets">
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
            <Section title="Custom Physical Dimensions (Meters)">
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

            {/* Transform Gizmo & Mesh Pick */}
            <Section title="Placement">
              <button
                onClick={() => setShowTransformGizmo(!showTransformGizmo)}
                aria-pressed={showTransformGizmo}
                className="option w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Move size={15} />
                  3D Transform Gizmo
                </span>
                <span className="text-[10px] font-extrabold">{showTransformGizmo ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setIsPickingMesh(!isPickingMesh)}
                data-state={isPickingMesh ? 'standby' : undefined}
                className="option w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <MousePointer size={15} />
                  {isPickingMesh ? 'Click Mesh in 3D View...' : 'Pick Screen Mesh from GLB'}
                </span>
                {isPickingMesh && <span className="tag tag-outline">Stby</span>}
                {boundMeshName && !isPickingMesh && (
                  <span className="text-[10px] opacity-70 truncate max-w-[100px]">
                    {boundMeshName}
                  </span>
                )}
              </button>
            </Section>

            {/* ================= 3 Stage Occlusion Test Items ================= */}
            <Section title="Stage Occlusion Items">
              {/* The ballroom's deck height lives on the Venue tab; a custom model's is set here */}
              {venueSource === 'custom-glb' && (
                <div className="space-y-1">
                  <SliderRow
                    label="Stage Floor Height"
                    value={`${customDeckHeight.toFixed(2)}m`}
                    min="0"
                    max="3"
                    step="0.05"
                    inputValue={customDeckHeight}
                    onChange={(e) => setCustomDeckHeight(parseFloat(e.target.value))}
                  />
                  <p className="text-[10px] text-ink/60">
                    Where the props stand. Picking the screen mesh sets this from the stage in front of it.
                  </p>
                </div>
              )}

              {/* 1. Presenter (Standing Person) */}
              <div className="space-y-2.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold flex items-center gap-1.5">
                    <User size={14} strokeWidth={1.5} className="text-ink/60" />
                    Presenter (1.8m)
                  </span>
                  <input
                    type="checkbox"
                    checked={showPresenter}
                    onChange={(e) => setShowPresenter(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </label>

                {showPresenter && (
                  <div className="space-y-2.5 pl-5">
                    <SliderRow
                      label="Lateral Position (X)"
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
                      label="Distance in Front (Z)"
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
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Mic size={14} strokeWidth={1.5} className="text-ink/60" />
                    Lectern / Podium (1.15m)
                  </span>
                  <input
                    type="checkbox"
                    checked={showLectern}
                    onChange={(e) => setShowLectern(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </label>

                {showLectern && (
                  <div className="space-y-2.5 pl-5">
                    <SliderRow
                      label="Lateral Position (X)"
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
                      label="Distance in Front (Z)"
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
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Users size={14} strokeWidth={1.5} className="text-ink/60" />
                    Four-Person Panel (Tub Chairs)
                  </span>
                  <input
                    type="checkbox"
                    checked={showPanel}
                    onChange={(e) => setShowPanel(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </label>
                <p className="text-[10px] text-ink/60 pl-5">
                  4 seated panelists in modern curved club chairs with coffee tables on stage.
                </p>

                {showPanel && (
                  <div className="space-y-2.5 pl-5">
                    <SliderRow
                      label="Center Position (X)"
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
                      label="Distance in Front (Z)"
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

        {/* ================= TAB 3: VENUE MODEL ================= */}
        {activeSidebarTab === 'venue' && (
          <>
            <Section title="Venue Source">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVenueSource('default-ballroom')}
                  aria-pressed={venueSource === 'default-ballroom'}
                  className="option justify-center"
                >
                  Demo Ballroom
                </button>
                <button
                  onClick={() => glbInputRef.current?.click()}
                  aria-pressed={venueSource === 'custom-glb'}
                  className="option justify-center"
                >
                  Upload .GLB
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

            {/* Default Ballroom Parameters */}
            {venueSource === 'default-ballroom' ? (
              <Section title="Stage Deck & Room Size">
                <SliderRow
                  label="Stage Height"
                  value={`${stageHeight.toFixed(2)}m`}
                  min="0.3"
                  max="2.5"
                  step="0.05"
                  inputValue={stageHeight}
                  onChange={(e) => setStageHeight(parseFloat(e.target.value))}
                />
                <SliderRow
                  label="Venue Length (Depth)"
                  value={`${venueLength}m`}
                  min="15"
                  max="60"
                  step="1"
                  inputValue={venueLength}
                  onChange={(e) => setVenueDimensions(venueWidth, parseInt(e.target.value, 10))}
                />
                <SliderRow
                  label="Venue Width"
                  value={`${venueWidth}m`}
                  min="12"
                  max="45"
                  step="1"
                  inputValue={venueWidth}
                  onChange={(e) => setVenueDimensions(parseInt(e.target.value, 10), venueLength)}
                />
              </Section>
            ) : (
              <Section title="Custom GLB Venue">
                <div className="flex items-start gap-2.5">
                  <Upload size={18} strokeWidth={1.5} className="text-ink/60 flex-none mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Custom GLB Venue Loaded</p>
                    <p className="text-[10px] text-ink/60">
                      Use &quot;Pick Screen Mesh from GLB&quot; on the Screen tab, then place your camera views on
                      the floor plan below. Shift + click the floor to sit anywhere.
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
                  <span className="text-[10px] text-ink/60 block">Camera Views (keys 1–4)</span>
                  <button
                    onClick={() => setIsFloorPlanOpen(!isFloorPlanOpen)}
                    disabled={!customVenueBounds}
                    aria-pressed={isFloorPlanOpen}
                    className="btn btn-secondary w-full justify-center disabled:opacity-50"
                  >
                    <MapIcon size={14} />
                    {isFloorPlanOpen ? 'Close Floor Plan' : 'Open Floor Plan'}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    {customSeatViews.map((view, i) => (
                      <div key={i} className="flex items-stretch gap-1">
                        <button
                          onClick={() => setFloorPlanSlot(i)}
                          aria-pressed={floorPlanSlot === i}
                          className="option flex-1 justify-between"
                          title={`Select View ${i + 1} to place on the floor plan`}
                        >
                          <span>View {i + 1}</span>
                          <span className="text-[10px] text-ink/60">{view ? 'Placed' : 'Not placed'}</span>
                        </button>
                        {view && (
                          <button
                            onClick={() => setCustomSeatView(i, null)}
                            className="btn btn-secondary px-1.5"
                            aria-label={`Clear View ${i + 1}`}
                            title={`Clear View ${i + 1}`}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isFloorPlanOpen && customVenueBounds && (
                    <SliderRow
                      label="Cut height"
                      value={`${(
                        (floorPlanCutHeight ?? defaultCutHeight(customVenueBounds)) -
                        customVenueBounds.min[1]
                      ).toFixed(1)}m`}
                      min={customVenueBounds.min[1]}
                      max={customVenueBounds.max[1]}
                      step="0.1"
                      inputValue={floorPlanCutHeight ?? defaultCutHeight(customVenueBounds)}
                      onChange={(e) => setFloorPlanCutHeight(parseFloat(e.target.value))}
                    />
                  )}
                  <p className="text-[10px] text-ink/60">
                    Click a floor spot to place the selected view, drag to point it. Keys 1–4 jump to the views.
                  </p>
                </div>
                <button onClick={() => glbInputRef.current?.click()} className="btn btn-secondary">
                  Change .GLB File
                </button>
              </Section>
            )}

            {/* Venue Lighting Rig & Controls */}
            <Section
              title={
                <>
                  <Sun size={12} />
                  Venue Lighting Rig
                </>
              }
              meta="Real-time"
            >
              {/* Lighting Presets */}
              <div>
                <span className="text-[10px] text-ink/60 block mb-1">Atmosphere Preset</span>
                <div className="seg w-full">
                  {lightingPresets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setLightingPreset(p.id)}
                      aria-pressed={lightingPreset === p.id}
                      className="seg-opt flex-1 py-1.5 text-[11px]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <SliderRow
                label="Audience House Lights"
                value={`${Math.round(houseLightsIntensity * 100)}%`}
                min="0.1"
                max="2.2"
                step="0.05"
                inputValue={houseLightsIntensity}
                onChange={(e) => setHouseLightsIntensity(parseFloat(e.target.value))}
              />
              <SliderRow
                label="Stage Key & Spotlights"
                value={`${Math.round(stageLightsIntensity * 100)}%`}
                min="0.2"
                max="2.5"
                step="0.05"
                inputValue={stageLightsIntensity}
                onChange={(e) => setStageLightsIntensity(parseFloat(e.target.value))}
              />

              {/* Ceiling Fixtures Toggle */}
              {venueSource === 'default-ballroom' && (
                <label className="pt-2.5 border-t border-ink/[0.12] flex items-center justify-between cursor-pointer">
                  <span className="text-[11px]">Ceiling Lighting Trusses</span>
                  <input
                    type="checkbox"
                    checked={showCeilingFixtures}
                    onChange={(e) => setShowCeilingFixtures(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </label>
              )}
            </Section>
          </>
        )}
      </div>
    </aside>
  );
};

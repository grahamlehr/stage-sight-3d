import React, { useState, useEffect, useRef } from 'react';
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
  Shield,
  RefreshCw,
  Sun,
  Users,
  Mic,
} from 'lucide-react';
import {
  useStageStore,
  ASPECT_RATIO_PRESETS,
  UvCropMode,
} from '../../store/useStageStore';
import {
  rasterizePdf,
  rasterizeImageFile,
  generateSampleExecutiveDeck,
} from '../../utils/pdfRasterizer';

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

  const screenWidth = useStageStore((s) => s.screenWidth);
  const screenHeight = useStageStore((s) => s.screenHeight);
  const setScreenDimensions = useStageStore((s) => s.setScreenDimensions);
  const setScreenPreset = useStageStore((s) => s.setScreenPreset);
  const showTransformGizmo = useStageStore((s) => s.showTransformGizmo);
  const setShowTransformGizmo = useStageStore((s) => s.setShowTransformGizmo);
  const isPickingMesh = useStageStore((s) => s.isPickingMesh);
  const setIsPickingMesh = useStageStore((s) => s.setIsPickingMesh);
  const boundMeshName = useStageStore((s) => s.boundMeshName);

  const showSafeGuides = useStageStore((s) => s.showSafeGuides);
  const setShowSafeGuides = useStageStore((s) => s.setShowSafeGuides);

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
  const refreshDevices = async () => {
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
  };

  useEffect(() => {
    refreshDevices();
  }, [selectedVideoDeviceId, setSelectedVideoDeviceId]);

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

  return (
    <aside className="absolute left-3 top-16 bottom-16 w-84 sm:w-92 z-20 flex flex-col rounded-2xl bg-zinc-950/95 border border-zinc-800/80 shadow-2xl backdrop-blur-md overflow-hidden text-zinc-200">
      {/* Sidebar Tabs */}
      <div className="grid grid-cols-3 border-b border-zinc-800/80 p-1 bg-zinc-900/60">
        <button
          onClick={() => setActiveSidebarTab('source')}
          className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition ${
            activeSidebarTab === 'source'
              ? 'bg-zinc-800 text-cyan-400 font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers size={14} />
          <span>Source</span>
        </button>

        <button
          onClick={() => setActiveSidebarTab('screen')}
          className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition ${
            activeSidebarTab === 'screen'
              ? 'bg-zinc-800 text-cyan-400 font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Monitor size={14} />
          <span>Screen</span>
        </button>

        <button
          onClick={() => setActiveSidebarTab('venue')}
          className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition ${
            activeSidebarTab === 'venue'
              ? 'bg-zinc-800 text-cyan-400 font-semibold shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Building size={14} />
          <span>Venue</span>
        </button>
      </div>

      {/* Tab Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* ================= TAB 1: CONTENT SOURCE ================= */}
        {activeSidebarTab === 'source' && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Active Content Feed
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSourceType('test-pattern')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                    sourceType === 'test-pattern'
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-semibold'
                      : 'bg-zinc-900/80 border-zinc-800/80 hover:bg-zinc-850 text-zinc-300'
                  }`}
                >
                  <Grid size={16} />
                  <div>
                    <div className="text-xs">Test Pattern</div>
                    <div className="text-[10px] text-zinc-500 font-normal">4K Rulers & Ladder</div>
                  </div>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                    sourceType === 'pdf'
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-semibold'
                      : 'bg-zinc-900/80 border-zinc-800/80 hover:bg-zinc-850 text-zinc-300'
                  }`}
                >
                  <FileText size={16} />
                  <div>
                    <div className="text-xs">PDF / Image</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Upload Slide Deck</div>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <button
                  onClick={handleStartCaptureCard}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                    sourceType === 'hdmi-capture'
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-semibold'
                      : 'bg-zinc-900/80 border-zinc-800/80 hover:bg-zinc-850 text-zinc-300'
                  }`}
                >
                  <Video size={16} />
                  <div>
                    <div className="text-xs">HDMI Capture</div>
                    <div className="text-[10px] text-zinc-500 font-normal">USB Video In</div>
                  </div>
                </button>

                <button
                  onClick={handleStartScreenShare}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                    sourceType === 'screen-share'
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-semibold'
                      : 'bg-zinc-900/80 border-zinc-800/80 hover:bg-zinc-850 text-zinc-300'
                  }`}
                >
                  <Share2 size={16} />
                  <div>
                    <div className="text-xs">Window Share</div>
                    <div className="text-[10px] text-zinc-500 font-normal">PowerPoint App</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Demo Deck Button */}
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">Instant Demo Deck</span>
                <Sparkles size={14} className="text-amber-400" />
              </div>
              <p className="text-[11px] text-zinc-400">
                Load 5 procedural 32:9 executive slides (Keynote, Clinical Data, Pipeline, Financials, Q&A) for immediate testing.
              </p>
              <button
                onClick={handleLoadSampleDeck}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold transition shadow-md"
              >
                Load Sample 32:9 Executive Deck (5 Slides)
              </button>
            </div>

            {/* Ingestion Progress indicator */}
            {isRasterizing && (
              <div className="p-3 rounded-xl bg-zinc-900 border border-cyan-500/40 text-cyan-300 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>Rasterizing slides at 4096px...</span>
                  <span>{rasterProgress.current} / {rasterProgress.total}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-200"
                    style={{
                      width: `${(rasterProgress.current / Math.max(1, rasterProgress.total)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* HDMI Capture Device Settings */}
            {sourceType === 'hdmi-capture' && (
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">Video Device</label>
                  <button onClick={refreshDevices} className="text-zinc-400 hover:text-white" title="Refresh Devices">
                    <RefreshCw size={12} />
                  </button>
                </div>
                <select
                  value={selectedVideoDeviceId}
                  onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Module D: Reactive 16:9 HDMI Letterbox UV Cropper Controls */}
            {(sourceType === 'hdmi-capture' || sourceType === 'screen-share') && (
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sliders size={13} className="text-cyan-400" />
                    Ultra-Wide Letterbox Cropper
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">16:9 EDID Fix</span>
                </div>

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
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition ${
                        uvCropMode === m.id
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {uvCropMode === 'manual' && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Repeat Y (Height Crop)</span>
                        <span className="font-mono">{manualUvRepeatY.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.01"
                        value={manualUvRepeatY}
                        onChange={(e) => setManualUvRepeatY(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Offset Y (Vertical Shift)</span>
                        <span className="font-mono">{manualUvOffsetY.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="0.9"
                        step="0.01"
                        value={manualUvOffsetY}
                        onChange={(e) => setManualUvOffsetY(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ================= TAB 2: SCREEN & STAGE ================= */}
        {activeSidebarTab === 'screen' && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Aspect Ratio Presets
              </label>
              <div className="space-y-1.5">
                {ASPECT_RATIO_PRESETS.map((p) => {
                  const isSelected =
                    Math.abs(screenWidth - p.width) < 0.05 &&
                    Math.abs(screenHeight - p.height) < 0.05;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setScreenPreset(p.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs transition ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                          : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-850 text-zinc-300'
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {p.width}m × {p.height}m
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Dimensions Input */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <label className="text-[11px] font-semibold text-zinc-300 block">
                Custom Physical Dimensions (Meters)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-zinc-500 block mb-1">Width (m)</span>
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    max="50"
                    value={screenWidth}
                    onChange={(e) =>
                      setScreenDimensions(Math.max(1, parseFloat(e.target.value) || 1), screenHeight)
                    }
                    className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block mb-1">Height (m)</span>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    max="20"
                    value={screenHeight}
                    onChange={(e) =>
                      setScreenDimensions(screenWidth, Math.max(1, parseFloat(e.target.value) || 1))
                    }
                    className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Transform Gizmo & Mesh Pick */}
            <div className="space-y-2">
              <button
                onClick={() => setShowTransformGizmo(!showTransformGizmo)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                  showTransformGizmo
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Move size={15} />
                  3D Transform Gizmo
                </span>
                <span className="font-mono text-[10px]">{showTransformGizmo ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setIsPickingMesh(!isPickingMesh)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                  isPickingMesh
                    ? 'bg-cyan-500 text-zinc-950 border-cyan-400 font-bold'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <MousePointer size={15} />
                  {isPickingMesh ? 'Click Mesh in 3D View...' : 'Pick Screen Mesh from GLB'}
                </span>
                {boundMeshName && !isPickingMesh && (
                  <span className="text-[10px] text-cyan-400 font-mono truncate max-w-[100px]">
                    {boundMeshName}
                  </span>
                )}
              </button>
            </div>

            {/* Safe Area Guides Toggle */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Shield size={14} className="text-cyan-400" />
                  Safe-Area Overlays
                </span>
                <input
                  type="checkbox"
                  checked={showSafeGuides}
                  onChange={(e) => setShowSafeGuides(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-zinc-400">
                Renders 5% Action-Safe (Cyan), 10% Title-Safe (Amber dashed), and 16:9 Center-Cut boundary guides.
              </p>
            </div>

            {/* ================= 3 Stage Occlusion Test Items ================= */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Stage Occlusion Items
              </label>

              {/* 1. Presenter (Standing Person) */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <User size={14} className="text-cyan-400" />
                    Presenter (1.8m)
                  </span>
                  <input
                    type="checkbox"
                    checked={showPresenter}
                    onChange={(e) => setShowPresenter(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </div>

                {showPresenter && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Lateral Position (X)</span>
                        <span className="font-mono text-cyan-300">{presenterOffset[0].toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="-7.5"
                        max="7.5"
                        step="0.1"
                        value={presenterOffset[0]}
                        onChange={(e) =>
                          setPresenterOffset([parseFloat(e.target.value), presenterOffset[1]])
                        }
                        className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Distance in Front (Z)</span>
                        <span className="font-mono text-cyan-300">{presenterOffset[1].toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="4.5"
                        step="0.1"
                        value={presenterOffset[1]}
                        onChange={(e) =>
                          setPresenterOffset([presenterOffset[0], parseFloat(e.target.value)])
                        }
                        className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Lectern / Podium */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Mic size={14} className="text-amber-400" />
                    Lectern / Podium (1.15m)
                  </span>
                  <input
                    type="checkbox"
                    checked={showLectern}
                    onChange={(e) => setShowLectern(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </div>

                {showLectern && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Lateral Position (X)</span>
                        <span className="font-mono text-amber-300">{lecternOffset[0].toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="-7.5"
                        max="7.5"
                        step="0.1"
                        value={lecternOffset[0]}
                        onChange={(e) =>
                          setLecternOffset([parseFloat(e.target.value), lecternOffset[1]])
                        }
                        className="w-full accent-amber-400 h-1 bg-zinc-800 rounded"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Distance in Front (Z)</span>
                        <span className="font-mono text-amber-300">{lecternOffset[1].toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="4.5"
                        step="0.1"
                        value={lecternOffset[1]}
                        onChange={(e) =>
                          setLecternOffset([lecternOffset[0], parseFloat(e.target.value)])
                        }
                        className="w-full accent-amber-400 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Four-Person Panel in Tub Chairs */}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Users size={14} className="text-emerald-400" />
                    Four-Person Panel (Tub Chairs)
                  </span>
                  <input
                    type="checkbox"
                    checked={showPanel}
                    onChange={(e) => setShowPanel(e.target.checked)}
                    className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-zinc-400">
                  4 seated panelists in modern curved club chairs with coffee tables on stage.
                </p>

                {showPanel && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Center Position (X)</span>
                        <span className="font-mono text-emerald-300">{panelOffset[0].toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="-5.0"
                        max="5.0"
                        step="0.1"
                        value={panelOffset[0]}
                        onChange={(e) =>
                          setPanelOffset([parseFloat(e.target.value), panelOffset[1]])
                        }
                        className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Distance in Front (Z)</span>
                        <span className="font-mono text-emerald-300">{panelOffset[1].toFixed(1)}m</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="4.5"
                        step="0.1"
                        value={panelOffset[1]}
                        onChange={(e) =>
                          setPanelOffset([panelOffset[0], parseFloat(e.target.value)])
                        }
                        className="w-full accent-emerald-400 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ================= TAB 3: VENUE MODEL ================= */}
        {activeSidebarTab === 'venue' && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                Venue Source
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVenueSource('default-ballroom')}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    venueSource === 'default-ballroom'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Demo Ballroom
                </button>
                <button
                  onClick={() => glbInputRef.current?.click()}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    venueSource === 'custom-glb'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
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
            </div>

            {/* Default Ballroom Parameters */}
            {venueSource === 'default-ballroom' ? (
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <span className="font-semibold text-zinc-200 block">Stage Deck & Room Size</span>

                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Stage Height</span>
                    <span className="font-mono">{stageHeight.toFixed(2)}m</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="2.5"
                    step="0.05"
                    value={stageHeight}
                    onChange={(e) => setStageHeight(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Venue Length (Depth)</span>
                    <span className="font-mono">{venueLength}m</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="1"
                    value={venueLength}
                    onChange={(e) => setVenueDimensions(venueWidth, parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                    <span>Venue Width</span>
                    <span className="font-mono">{venueWidth}m</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="45"
                    step="1"
                    value={venueWidth}
                    onChange={(e) => setVenueDimensions(parseInt(e.target.value, 10), venueLength)}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-center">
                <Upload size={24} className="mx-auto text-cyan-400" />
                <p className="text-xs font-semibold text-zinc-200">Custom GLB Venue Loaded</p>
                <p className="text-[10px] text-zinc-400">
                  Click meshes to test seating or use &quot;Pick Screen Mesh from GLB&quot; on the Screen tab.
                </p>
                <button
                  onClick={() => glbInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
                >
                  Change .GLB File
                </button>
              </div>
            )}

            {/* Venue Lighting Rig & Controls */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sun size={14} className="text-amber-400" />
                  Venue Lighting Rig
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Real-time</span>
              </div>

              {/* Lighting Presets */}
              <div>
                <span className="text-[10px] text-zinc-500 block mb-1">Atmosphere Preset</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setLightingPreset('conference-bright')}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border text-center transition ${
                      lightingPreset === 'conference-bright'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Bright
                  </button>
                  <button
                    onClick={() => setLightingPreset('ballroom-standard')}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border text-center transition ${
                      lightingPreset === 'ballroom-standard'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setLightingPreset('keynote-dark')}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border text-center transition ${
                      lightingPreset === 'keynote-dark'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-semibold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              {/* House Lights Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Audience House Lights</span>
                  <span className="font-mono">{Math.round(houseLightsIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.2"
                  step="0.05"
                  value={houseLightsIntensity}
                  onChange={(e) => setHouseLightsIntensity(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1 bg-zinc-800 rounded"
                />
              </div>

              {/* Stage Lights Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Stage Key & Spotlights</span>
                  <span className="font-mono">{Math.round(stageLightsIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={stageLightsIntensity}
                  onChange={(e) => setStageLightsIntensity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded"
                />
              </div>

              {/* Ceiling Fixtures Toggle */}
              {venueSource === 'default-ballroom' && (
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-300">Ceiling Lighting Trusses</span>
                  <input
                    type="checkbox"
                    checked={showCeilingFixtures}
                    onChange={(e) => setShowCeilingFixtures(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

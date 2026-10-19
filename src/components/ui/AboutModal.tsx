import React, { useEffect } from 'react';
import { X, ExternalLink, ShieldCheck, Compass, Eye, Monitor, PlayCircle } from 'lucide-react';
import { Logo } from './Logo';

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onStartTour }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const features = [
    { icon: Eye, title: 'AVIXA DISCAS', body: 'Real-time D/H acuity & off-axis angle calculations' },
    { icon: Monitor, title: '4K LED Calibration', body: 'Dynamic aspect ratio test patterns & SMPTE bars' },
    { icon: Compass, title: 'Dual-FOV Optics', body: '50° Room Context vs 25° Human Eye Focus' },
    { icon: ShieldCheck, title: 'Stage Occlusion', body: 'Presenter, Lectern, and 4-Person Panel check' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-in fade-in duration-150">
      <div
        className="panel relative w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn btn-ghost btn-icon absolute top-3 right-3 z-10 text-ink/60 hover:text-ink"
          title="Close (Esc)"
        >
          <X size={16} />
        </button>

        {/* Hero Artwork Banner */}
        <div className="relative w-full bg-ground p-6 flex flex-col items-center justify-center border-b-2 border-ink/20">
          <Logo variant="full" className="w-56 h-auto" />
          <div className="mt-3 text-center">
            <h2 className="text-xl flex items-center justify-center gap-2">
              StageSight 3D
              <span className="tag tag-outline">v0.1.0 MVP</span>
            </h2>
            <p className="text-xs text-ink/60 mt-1 max-w-sm">
              Ultra-Wide Event Screen, LED Wall & Sightline Simulator
            </p>
          </div>
        </div>

        {/* Feature Badges & Technical Architecture */}
        <div className="p-6 space-y-5 text-xs">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-2.5 pt-3 border-t border-ink/20">
                <Icon size={16} strokeWidth={1.5} className="text-ink/60 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{title}</div>
                  <div className="text-[11px] text-ink/60">{body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Keyboard Reference */}
          <div className="space-y-2">
            <span className="label">Keyboard &amp; VR Navigation</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-ink/70">
              <div><kbd className="kbd">←</kbd> / <kbd className="kbd">→</kbd> Prev / Next Slide</div>
              <div><kbd className="kbd">Space</kbd> Advance Slide</div>
              <div><kbd className="kbd">1–4</kbd> Seat Presets</div>
              <div><kbd className="kbd">R</kbd> / <kbd className="kbd">L</kbd> Recenter VR / Lighting</div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-ink/20 text-[11px] text-ink/60">
            <span>StageSight 3D Production Suite</span>
            <div className="flex items-center gap-1">
              <button onClick={onStartTour} className="btn btn-ghost text-[11px]">
                <PlayCircle size={12} />
                <span>Take the tour</span>
              </button>
              <a
                href="./logo.svg"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost text-[11px]"
              >
                <span>Vector Logo</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

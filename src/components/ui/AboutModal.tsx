import React, { useEffect } from 'react';
import { X, ExternalLink, ShieldCheck, Compass, Eye, Monitor } from 'lucide-react';
import { Logo } from './Logo';

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-2xl overflow-hidden text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition"
          title="Close (Esc)"
        >
          <X size={16} />
        </button>

        {/* Hero Artwork Banner */}
        <div className="relative w-full bg-zinc-900/60 p-6 flex flex-col items-center justify-center border-b border-zinc-800/80">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
          <Logo variant="full" className="w-56 h-auto" glow />
          <div className="mt-3 text-center">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              StageSight <span className="text-cyan-400">3D</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                v0.1.0 MVP
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              Ultra-Wide Event Screen, LED Wall & Sightline Simulator
            </p>
          </div>
        </div>

        {/* Feature Badges & Technical Architecture */}
        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <Eye size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-zinc-200">AVIXA DISCAS</div>
                <div className="text-[11px] text-zinc-400">Real-time D/H acuity & off-axis angle calculations</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <Monitor size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-zinc-200">4K LED Calibration</div>
                <div className="text-[11px] text-zinc-400">Dynamic aspect ratio test patterns & SMPTE bars</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <Compass size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-zinc-200">Dual-FOV Optics</div>
                <div className="text-[11px] text-zinc-400">50° Room Context vs 25° Human Eye Focus</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <ShieldCheck size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-zinc-200">Stage Occlusion</div>
                <div className="text-[11px] text-zinc-400">Presenter, Lectern, and 4-Person Panel check</div>
              </div>
            </div>
          </div>

          {/* Quick Keyboard Reference */}
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5">
            <span className="font-semibold text-zinc-300 block text-[11px] uppercase tracking-wider">
              Keyboard &amp; VR Navigation
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-400">
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">→</kbd> Prev / Next Slide</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">Space</kbd> Advance Slide</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">1–4</kbd> Seat Presets</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">R</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono">L</kbd> Recenter VR / Lighting</div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-[11px] text-zinc-500">
            <span>StageSight 3D Production Suite</span>
            <a
              href="./logo.svg"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition"
            >
              <span>Vector Logo</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

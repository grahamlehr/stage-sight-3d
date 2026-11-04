import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Presentation, Ratio, Building2, Users, PlayCircle } from 'lucide-react';
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
    { icon: Presentation, title: 'Live Content', body: 'Import and preview slides and videos' },
    { icon: Ratio, title: 'Custom Screen Ratios', body: 'Super widescreen mapped and cropped automatically' },
    { icon: Building2, title: 'Bespoke Venue Models', body: 'Upload your venue to preview in situ' },
    { icon: Users, title: 'Content Masking', body: 'Two presenters, lectern and 4-person panel check' },
  ];

  // Portalled to <body>: the modal is opened from the top bar, whose
  // pointer-events-none would otherwise make every click fall through to the scene.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay pointer-events-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        className="dialog relative w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn btn-ghost btn-icon absolute top-3 right-3 z-10 text-ink/60 hover:text-ink"
          title="Close (Esc)"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Hero Artwork Banner */}
        <div className="relative w-full bg-ground p-6 flex flex-col items-start border-b-2 border-ink">
          <Logo variant="full" className="w-48 h-auto -ml-2" />
          <div className="mt-3">
            <h2 id="about-title" className="text-xl flex items-center gap-2">
              StageSight 3D
              <span className="tag tag-outline">v{__APP_VERSION__}</span>
            </h2>
            <p className="label mt-1.5">
              Screen, Content &amp; Sightline Previewer
            </p>
          </div>
        </div>

        {/* Feature Badges & Technical Architecture */}
        <div className="p-6 space-y-5 text-xs">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-2.5 pt-3 border-t border-ink/20">
                <Icon size={16} strokeWidth={1.5} className="text-ink/60 shrink-0 mt-0.5" />
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
            <span>StageSight 3D</span>
            <div className="flex items-center gap-1">
              <button onClick={onStartTour} className="btn btn-ghost text-[11px]">
                <PlayCircle size={12} />
                <span>Take the tour</span>
              </button>
              <a
                href="https://grahamlehr.github.io"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost text-[11px]"
              >
                <span>grahamlehr.github.io</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* CC-BY 3.0 asks for attribution where the models are used */}
          <p className="text-[10px] text-ink/60">
            Presenter models: "Business Man" and "Suit" by{' '}
            <a href="https://poly.pizza/u/Quaternius" target="_blank" rel="noopener noreferrer" className="underline">
              Quaternius
            </a>
            , licensed{' '}
            <a
              href="https://creativecommons.org/licenses/by/3.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              CC-BY 3.0
            </a>
            , via Poly Pizza. Scaled, posed and trimmed to one animation.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

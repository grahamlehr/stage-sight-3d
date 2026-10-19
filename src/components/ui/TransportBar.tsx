import React, { useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useStageStore } from '../../store/useStageStore';

// Thumbnails are rendered ~44px tall, so encode them small rather than
// re-encoding full-resolution slide canvases.
const THUMBNAIL_WIDTH = 160;

export const TransportBar: React.FC = () => {
  const sourceType = useStageStore((s) => s.sourceType);
  const setSourceType = useStageStore((s) => s.setSourceType);
  const slides = useStageStore((s) => s.slides);
  const currentSlideIndex = useStageStore((s) => s.currentSlideIndex);
  const setCurrentSlideIndex = useStageStore((s) => s.setCurrentSlideIndex);

  // Encode the thumbnail strip once per deck. Doing this in the render body meant
  // every re-render — including every slide advance — synchronously JPEG-encoded
  // every slide canvas at full rasterization resolution.
  const thumbnails = useMemo(
    () =>
      slides.map((canvas) => {
        const aspect = `${canvas.width} / ${canvas.height}`;
        const scale = THUMBNAIL_WIDTH / Math.max(1, canvas.width);
        const thumb = document.createElement('canvas');
        thumb.width = THUMBNAIL_WIDTH;
        thumb.height = Math.max(1, Math.round(canvas.height * scale));
        const ctx = thumb.getContext('2d');
        if (!ctx) return { url: '', aspect };
        ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
        return { url: thumb.toDataURL('image/jpeg', 0.6), aspect };
      }),
    [slides]
  );

  // Keyboard navigation for Left / Right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sourceType !== 'pdf' || slides.length === 0) return;

      // Don't swallow typing or native range-slider keys from the sidebar's
      // controls — these shortcuts are global and preventDefault here.
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlideIndex((currentSlideIndex + 1) % slides.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIndex((currentSlideIndex - 1 + slides.length) % slides.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sourceType, slides.length, currentSlideIndex, setCurrentSlideIndex]);

  if (sourceType !== 'pdf' || slides.length === 0) {
    return null;
  }

  const prevSlide = () => {
    setCurrentSlideIndex((currentSlideIndex - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentSlideIndex((currentSlideIndex + 1) % slides.length);
  };

  return (
    <footer className="panel absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-3 py-2 max-w-[90vw]">
      {/* Slide Navigation Controls */}
      <div className="flex items-center gap-2 pr-3 border-r border-ink/20">
        <button
          onClick={prevSlide}
          className="btn btn-secondary btn-icon"
          title="Previous Slide (Left Arrow)"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="px-2 text-xs whitespace-nowrap tabular-nums">
          <span className="text-ink/60">Slide</span>{' '}
          <span className="font-extrabold text-accent-400">{currentSlideIndex + 1}</span>{' '}
          <span className="text-ink/60">of</span> <span className="font-extrabold">{slides.length}</span>
        </div>

        <button
          onClick={nextSlide}
          className="btn btn-secondary btn-icon"
          title="Next Slide (Right Arrow)"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Horizontal Thumbnail Tray */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-[60vw] scrollbar-thin">
        {thumbnails.map((thumb, index) => {
          const isSelected = index === currentSlideIndex;
          return (
            <button
              key={index}
              onClick={() => setCurrentSlideIndex(index)}
              aria-current={isSelected ? 'true' : undefined}
              className={`relative flex-shrink-0 h-11 overflow-hidden border-2 transition ${
                isSelected
                  ? 'border-accent'
                  : 'border-transparent opacity-50 hover:opacity-100 hover:border-ink/45'
              }`}
              style={{
                aspectRatio: thumb.aspect,
              }}
              title={`Jump to Slide ${index + 1}`}
            >
              {/* Thumbnail snapshot */}
              <img
                src={thumb.url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <span
                className={`absolute bottom-0 right-0 px-1 text-[9px] font-extrabold tabular-nums ${
                  isSelected ? 'bg-accent text-white' : 'bg-ground text-ink'
                }`}
              >
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Close/Return to Test Pattern */}
      <div className="pl-3 border-l border-ink/20">
        <button
          onClick={() => setSourceType('test-pattern')}
          className="btn btn-ghost btn-icon text-ink/60 hover:text-ink"
          title="Exit Slide Deck (Return to Test Pattern)"
        >
          <X size={15} />
        </button>
      </div>
    </footer>
  );
};

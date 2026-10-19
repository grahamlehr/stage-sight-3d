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
    <footer className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-3 py-2 rounded-2xl bg-zinc-950/95 border border-zinc-800/80 backdrop-blur-md shadow-2xl max-w-[90vw]">
      {/* Slide Navigation Controls */}
      <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
        <button
          onClick={prevSlide}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
          title="Previous Slide (Left Arrow)"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="px-2 font-mono text-xs font-semibold text-zinc-200 whitespace-nowrap">
          Slide <span className="text-cyan-400">{currentSlideIndex + 1}</span> of {slides.length}
        </div>

        <button
          onClick={nextSlide}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition"
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
              className={`relative flex-shrink-0 h-11 rounded-md overflow-hidden border transition ${
                isSelected
                  ? 'border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'
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
              <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/80 font-mono text-[9px] text-zinc-300">
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Close/Return to Test Pattern */}
      <div className="pl-2 border-l border-zinc-800">
        <button
          onClick={() => setSourceType('test-pattern')}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition"
          title="Exit Slide Deck (Return to Test Pattern)"
        >
          <X size={15} />
        </button>
      </div>
    </footer>
  );
};

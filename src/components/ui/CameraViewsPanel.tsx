import React from 'react';
import { Camera, X } from 'lucide-react';
import { useStageStore } from '../../store/useStageStore';
import { defaultCutHeight } from '../../utils/floorPlan';

/** Docked beside the floor plan while it is open: place, name and clear the custom venue's camera views. */
export const CameraViewsPanel: React.FC = () => {
  const customSeatViews = useStageStore((s) => s.customSeatViews);
  const setCustomSeatView = useStageStore((s) => s.setCustomSeatView);
  const renameCustomSeatView = useStageStore((s) => s.renameCustomSeatView);
  const updateCustomSeatViewFromCamera = useStageStore((s) => s.updateCustomSeatViewFromCamera);
  const setIsFloorPlanOpen = useStageStore((s) => s.setIsFloorPlanOpen);
  const floorPlanSlot = useStageStore((s) => s.floorPlanSlot);
  const setFloorPlanSlot = useStageStore((s) => s.setFloorPlanSlot);
  const floorPlanCutHeight = useStageStore((s) => s.floorPlanCutHeight);
  const setFloorPlanCutHeight = useStageStore((s) => s.setFloorPlanCutHeight);
  const customVenueBounds = useStageStore((s) => s.customVenueBounds);

  return (
    <aside data-guide="camera-views" className="panel absolute right-3 top-28 xl:top-16 w-72 z-20 p-3 space-y-2.5 text-xs">
      <span className="label">Camera views (keys 1–4)</span>
      <div className="grid grid-cols-2 gap-2">
        {customSeatViews.map((view, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-stretch gap-1">
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
            {view && (
              <div className="flex items-stretch gap-1">
                <input
                  type="text"
                  value={view.name}
                  onChange={(e) => renameCustomSeatView(i, e.target.value)}
                  placeholder={`View ${i + 1}`}
                  aria-label={`Name for View ${i + 1}`}
                  className="input min-w-0 flex-1"
                  maxLength={60}
                />
                <button
                  onClick={() => updateCustomSeatViewFromCamera(i)}
                  className="btn btn-secondary px-1.5"
                  aria-label={`Update View ${i + 1} from camera`}
                  title="Set this view to the current camera"
                >
                  <Camera size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {customVenueBounds && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-ink/60">
            <span>Cut height</span>
            <span className="readout text-ink">
              {((floorPlanCutHeight ?? defaultCutHeight(customVenueBounds)) - customVenueBounds.min[1]).toFixed(1)}m
            </span>
          </div>
          <input
            type="range"
            min={customVenueBounds.min[1]}
            max={customVenueBounds.max[1]}
            step="0.1"
            value={floorPlanCutHeight ?? defaultCutHeight(customVenueBounds)}
            onChange={(e) => setFloorPlanCutHeight(parseFloat(e.target.value))}
          />
        </div>
      )}
      <p className="text-[10px] text-ink/60">
        Click a floor spot to place the selected view, drag to point it. Keys 1–4 jump to the views.
      </p>
      <button onClick={() => setIsFloorPlanOpen(false)} className="btn btn-primary w-full justify-center">
        Done
      </button>
    </aside>
  );
};

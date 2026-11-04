import React from 'react';
import { useStageStore } from '../../store/useStageStore';
import { describeWorstScreen, type FlagLevel } from '../../utils/worstScreenFlag';

const DH_SHORT_LABEL: Record<string, string> = {
  detail: 'Detail',
  reading: 'Reading',
  marginal: 'Marginal',
  fail: 'Too far',
};

const ANGLE_SHORT_LABEL: Record<string, string> = {
  optimal: 'On-axis',
  steep: 'Steep',
  extreme: 'Extreme',
};

// Sightline status follows Signal's status rules: an outlined tag with a go dot
// passes, an amber fill is marginal, and a solid ink tag fails. Fill carries the
// meaning, so it still reads without colour.
const statusTag = (level: FlagLevel) => (level === 'go' ? 'tag-go' : level === 'warn' ? 'tag-warn' : 'tag-solid');

const StatusTag: React.FC<{ level: FlagLevel; className?: string; children: React.ReactNode }> = ({
  level,
  className = '',
  children,
}) => (
  <span className={`tag ${statusTag(level)} ${className}`}>
    {level === 'go' && <span className="signal-dot bg-signal-go" />}
    {children}
  </span>
);

/**
 * Live AVIXA DISCAS readout for the primary screen, docked bottom right: the
 * numbers live here, away from the controls in the top bar. One row per
 * measure, with the full band description underneath.
 */
export const SightlinePanel: React.FC = () => {
  const telemetry = useStageStore((s) => s.telemetry);
  const isStoryboardOpen = useStageStore((s) => s.isStoryboardOpen);
  const isVrPresenting = useStageStore((s) => s.isVrPresenting);

  const dhLevel: FlagLevel =
    telemetry.dhStatus === 'detail' || telemetry.dhStatus === 'reading'
      ? 'go'
      : telemetry.dhStatus === 'marginal'
      ? 'warn'
      : 'fail';
  const angleLevel: FlagLevel =
    telemetry.angleStatus === 'optimal' ? 'go' : telemetry.angleStatus === 'steep' ? 'warn' : 'fail';
  const worstFlag = describeWorstScreen(telemetry.worst);

  // Below 1280px the hint strip and slide transport bar reach this corner, so the
  // card lifts above them. The storyboard tray (23rem) docks on the right edge;
  // sit beside it, above the transport bar, while it's open.
  const storyboardShowing = isStoryboardOpen && !isVrPresenting;

  return (
    <aside
      data-guide="telemetry"
      aria-label="Sightlines"
      className={`panel absolute z-20 w-72 p-3 text-xs ${
        storyboardShowing ? 'bottom-24 right-[calc(23rem+1.5rem)]' : 'bottom-24 xl:bottom-3 right-3'
      }`}
    >
      <span className="label whitespace-nowrap">Sightlines · primary screen</span>

      <dl className="mt-2">
        <div className="flex items-baseline justify-between gap-3 py-1.5 border-t border-hairline">
          <dt className="label whitespace-nowrap" title="Viewing distance (D) from this seat to the primary screen">
            Distance
          </dt>
          <dd className="text-base readout whitespace-nowrap">{telemetry.viewingDistance}m</dd>
        </div>

        <div
          className="py-1.5 border-t border-hairline"
          title="AVIXA DISCAS distance-to-height ratio: viewing distance over image height"
        >
          <div className="flex items-center justify-between gap-3">
            <dt className="label whitespace-nowrap">D/H ratio</dt>
            <dd className="flex items-center gap-2">
              <span className="text-base readout whitespace-nowrap">{telemetry.dhRatio}x H</span>
              <StatusTag level={dhLevel}>{DH_SHORT_LABEL[telemetry.dhStatus] ?? telemetry.dhStatus}</StatusTag>
            </dd>
          </div>
          <dd className="mt-0.5 text-[11px] text-ink/60">{telemetry.dhLabel}</dd>
        </div>

        <div className="py-1.5 border-t border-hairline" title="Horizontal angle off the screen's centre line">
          <div className="flex items-center justify-between gap-3">
            <dt className="label whitespace-nowrap">Off-axis</dt>
            <dd className="flex items-center gap-2">
              <span className="text-base readout whitespace-nowrap">{telemetry.offAxisAngle}°</span>
              <StatusTag level={angleLevel}>
                {ANGLE_SHORT_LABEL[telemetry.angleStatus] ?? telemetry.angleStatus}
              </StatusTag>
            </dd>
          </div>
          <dd className="mt-0.5 text-[11px] text-ink/60">{telemetry.angleLabel}</dd>
        </div>
      </dl>

      {/* Worst other screen, when it reads worse than the primary */}
      {worstFlag && (
        <div
          className="pt-2 border-t-2 border-ink"
          title="The screen that reads worst from this seat. The numbers above are for the primary screen."
        >
          <StatusTag level={worstFlag.level} className="whitespace-normal py-1 leading-tight">
            {worstFlag.text}
          </StatusTag>
        </div>
      )}
    </aside>
  );
};

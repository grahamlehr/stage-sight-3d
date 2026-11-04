import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  /** Plain-text name for assistive tech when `label` is not a string. */
  ariaLabel?: string;
  icon?: React.ReactNode;
  /** Short helper line under the label. */
  hint?: React.ReactNode;
  disabled?: boolean;
}

/** The one on/off control: a labelled row with a track and thumb on the right. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, ariaLabel, icon, hint, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="switch"
  >
    <span className="flex min-w-0 items-start gap-2">
      {icon && <span className="mt-px flex-none text-ink/60">{icon}</span>}
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-[10px] font-normal text-ink/60">{hint}</span>}
      </span>
    </span>
    <span className="switch-track" aria-hidden="true">
      <span className="switch-thumb" />
    </span>
  </button>
);

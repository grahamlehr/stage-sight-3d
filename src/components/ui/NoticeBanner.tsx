import React from 'react';
import { X } from 'lucide-react';
import { useStageStore, type Notice } from '../../store/useStageStore';

/** Shows the store's notice inline if it belongs to `area`, with a dismiss button. */
export const NoticeBanner: React.FC<{ area: Notice['area'] }> = ({ area }) => {
  const notice = useStageStore((s) => (s.notice?.area === area ? s.notice : null));
  const clearNotice = useStageStore((s) => s.clearNotice);
  if (!notice) return null;
  return (
    <div role={notice.tone === 'error' ? 'alert' : 'status'} data-tone={notice.tone} className="notice">
      <p className="flex-1 min-w-0">{notice.text}</p>
      <button
        type="button"
        onClick={clearNotice}
        aria-label="Dismiss message"
        title="Dismiss"
        className="btn btn-ghost btn-icon flex-none -m-1.5 w-6 h-6"
      >
        <X size={12} />
      </button>
    </div>
  );
};

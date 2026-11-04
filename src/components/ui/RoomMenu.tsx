import React, { useEffect, useRef } from 'react';
import { FolderOpen, ChevronDown } from 'lucide-react';
import { hasUnsavedRoomChanges, useStageStore } from '../../store/useStageStore';
import { openRoomFromFile } from '../../utils/openRoomFile';

/** Top-bar room menu: the room's name and notes, and the Save and Open buttons for the `.stagesight` file. */
export const RoomMenu: React.FC = () => {
  const isOpen = useStageStore((s) => s.isRoomMenuOpen);
  const setIsOpen = useStageStore((s) => s.setIsRoomMenuOpen);
  const roomName = useStageStore((s) => s.roomName);
  const setRoomName = useStageStore((s) => s.setRoomName);
  const roomNotes = useStageStore((s) => s.roomNotes);
  const setRoomNotes = useStageStore((s) => s.setRoomNotes);
  const isUnsaved = useStageStore((s) => hasUnsavedRoomChanges(s));
  const rootRef = useRef<HTMLDivElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);

  // Close on a click outside the menu or on Escape while focus is inside it
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        useStageStore.getState().setIsRoomMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  const handleSave = async () => {
    const result = await useStageStore.getState().saveRoom();
    if (!result.ok) alert(result.message);
  };

  const handleOpen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (file) await openRoomFromFile(file);
  };

  const label = roomName.trim() || 'Untitled room';

  return (
    <div
      ref={rootRef}
      data-guide="room-menu"
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && isOpen) {
          e.stopPropagation();
          setIsOpen(false);
        }
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`btn h-9 gap-2 max-w-[11rem] ${isOpen ? 'btn-primary' : 'btn-secondary'}`}
        title="Room file: name, notes, save and open"
      >
        <FolderOpen size={14} className="flex-none" />
        <span className="text-sm truncate">{label}</span>
        {isUnsaved && (
          <span className="signal-dot bg-signal-warn flex-none" title="Unsaved changes" aria-label="Unsaved changes" />
        )}
        <ChevronDown size={12} className="flex-none opacity-60" />
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Room file" className="panel absolute left-0 top-full mt-1.5 w-80 p-3 z-30 space-y-2.5 text-xs">
          <span className="label">Room file</span>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            aria-label="Room name"
            placeholder="e.g. Hilton Park Lane, Ballroom A"
            maxLength={120}
            className="input w-full"
          />
          <textarea
            value={roomNotes}
            onChange={(e) => setRoomNotes(e.target.value)}
            aria-label="Room notes"
            placeholder="Notes"
            rows={3}
            className="input w-full resize-y"
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleSave} className="btn btn-secondary">
              Save room
            </button>
            <button onClick={() => roomInputRef.current?.click()} className="btn btn-secondary">
              Open room
            </button>
            <input ref={roomInputRef} type="file" accept=".stagesight" className="hidden" onChange={handleOpen} />
          </div>
          <p className="text-[10px] text-ink/60">
            Saves the venue, screens, views and stage dressing. Content isn&apos;t saved.
          </p>
        </div>
      )}
    </div>
  );
};

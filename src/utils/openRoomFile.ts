import { hasUnsavedRoomChanges, useStageStore } from '../store/useStageStore';

/**
 * Opens a `.stagesight` file with the unsaved-changes prompt and an inline error in the room menu.
 * Shared by the Open room button and drag-and-drop. Returns true if the room was opened.
 */
export async function openRoomFromFile(file: Blob): Promise<boolean> {
  if (
    hasUnsavedRoomChanges(useStageStore.getState()) &&
    !window.confirm('You have unsaved changes to this room. Open another room anyway?')
  ) {
    return false;
  }
  const result = await useStageStore.getState().loadRoom(file);
  if (!result.ok) {
    // The room menu shows the reason, so open it
    const { showNotice, setIsRoomMenuOpen } = useStageStore.getState();
    showNotice({ tone: 'error', area: 'room', text: result.message });
    setIsRoomMenuOpen(true);
    return false;
  }
  // Show the name and notes that came with the room
  useStageStore.getState().setIsRoomMenuOpen(true);
  return true;
}

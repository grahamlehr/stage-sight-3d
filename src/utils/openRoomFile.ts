import { hasUnsavedRoomChanges, useStageStore } from '../store/useStageStore';

/**
 * Opens a `.stagesight` file with the unsaved-changes prompt and an error alert.
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
    alert(result.message);
    return false;
  }
  // Show the name and notes that came with the room
  useStageStore.setState({ isSidebarOpen: true, activeSidebarTab: 'venue' });
  return true;
}

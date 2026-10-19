// Remembers whether the user has asked not to see the first-run guide again.
// Storage can be missing or throw (private windows, blocked site data), so every
// access is guarded: failing to read shows the guide, failing to write is ignored.

export const GUIDE_DISMISSED_KEY = 'stagesight3d.firstRunGuide.dismissed';

type GuideStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const defaultStorage = (): GuideStorage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const hasDismissedGuide = (storage: GuideStorage | null = defaultStorage()): boolean => {
  try {
    return storage?.getItem(GUIDE_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

export const setGuideDismissed = (
  dismissed: boolean,
  storage: GuideStorage | null = defaultStorage()
): void => {
  try {
    if (dismissed) {
      storage?.setItem(GUIDE_DISMISSED_KEY, '1');
    } else {
      storage?.removeItem(GUIDE_DISMISSED_KEY);
    }
  } catch {
    // Not persisted; the guide will simply show again next visit.
  }
};

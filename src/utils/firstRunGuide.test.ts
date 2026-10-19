import { describe, expect, it } from 'vitest';
import { GUIDE_DISMISSED_KEY, hasDismissedGuide, setGuideDismissed } from './firstRunGuide';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    data,
  };
};

const throwingStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('first-run guide persistence', () => {
  it('shows the guide to a new user', () => {
    expect(hasDismissedGuide(memoryStorage())).toBe(false);
  });

  it('remembers a dismissal', () => {
    const storage = memoryStorage();
    setGuideDismissed(true, storage);
    expect(storage.data.get(GUIDE_DISMISSED_KEY)).toBe('1');
    expect(hasDismissedGuide(storage)).toBe(true);
  });

  it('clears a dismissal', () => {
    const storage = memoryStorage();
    setGuideDismissed(true, storage);
    setGuideDismissed(false, storage);
    expect(hasDismissedGuide(storage)).toBe(false);
  });

  it('shows the guide when storage is unavailable or throws', () => {
    expect(hasDismissedGuide(null)).toBe(false);
    expect(hasDismissedGuide(throwingStorage)).toBe(false);
  });

  it('does not throw when storage cannot be written', () => {
    expect(() => setGuideDismissed(true, throwingStorage)).not.toThrow();
    expect(() => setGuideDismissed(true, null)).not.toThrow();
  });
});

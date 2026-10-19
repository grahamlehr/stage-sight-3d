import { useEffect } from 'react';

/** Disposes three.js resources when they are replaced or the component unmounts. */
export const useDisposables = (items: ReadonlyArray<{ dispose: () => void }>) => {
  useEffect(() => () => items.forEach((item) => item.dispose()), [items]);
};

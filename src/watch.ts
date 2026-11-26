import { realpathSync, watch } from 'node:fs';
import { basename, dirname } from 'node:path';

const DEBOUNCE_MS = 50;

export const watchFile = (
  path: string,
  onChange: () => void,
  onError: (error: Error) => void = () => {},
): (() => void) => {
  let target = path;
  try {
    target = realpathSync(path);
  } catch {
    target = path;
  }
  const name = basename(target);
  let timer: NodeJS.Timeout | undefined;
  let closed = false;

  const watcher = watch(dirname(target), (_event, filename) => {
    if (closed || (filename !== null && filename !== name)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!closed) onChange();
    }, DEBOUNCE_MS);
  });
  watcher.on('error', (error) => {
    if (!closed) onError(error);
  });

  return () => {
    closed = true;
    clearTimeout(timer);
    watcher.close();
  };
};

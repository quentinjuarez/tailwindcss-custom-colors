import type { Mode } from './theme.js';

export type Scheme = 'light' | 'dark' | 'system';

export type SchemeTarget = {
  classList: { toggle(name: string, force?: boolean): boolean };
  style: { colorScheme: string };
};

const QUERY = '(prefers-color-scheme: dark)';

type MediaQuery = {
  matches: boolean;
  addEventListener(
    type: 'change',
    fn: (event: { matches: boolean }) => void,
  ): void;
  removeEventListener(
    type: 'change',
    fn: (event: { matches: boolean }) => void,
  ): void;
};

type Env = {
  matchMedia?: (query: string) => MediaQuery;
  localStorage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  document?: { documentElement?: SchemeTarget };
};

const env = (): Env => globalThis as Env;

const assertScheme = (scheme: unknown): Scheme => {
  if (scheme !== 'light' && scheme !== 'dark' && scheme !== 'system') {
    throw new Error(
      `Invalid scheme: ${String(scheme)}. Expected 'light', 'dark' or 'system'`,
    );
  }
  return scheme;
};

const assertKey = (key: unknown): string => {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_.:-]{1,64}$/.test(key)) {
    throw new Error(
      `Invalid storage key: ${JSON.stringify(String(key).slice(0, 40))}`,
    );
  }
  return key;
};

const systemMode = (): Mode =>
  env().matchMedia?.(QUERY).matches ? 'dark' : 'light';

export const applyScheme = (scheme: Scheme, element?: SchemeTarget): Mode => {
  assertScheme(scheme);
  const target = element ?? env().document?.documentElement;
  if (!target) {
    throw new Error(
      'applyScheme() needs an element when no global document is available',
    );
  }
  const mode = scheme === 'system' ? systemMode() : scheme;
  target.classList.toggle('dark', mode === 'dark');
  target.style.colorScheme = mode;
  return mode;
};

export const watchScheme = (onChange: (mode: Mode) => void): (() => void) => {
  const media = env().matchMedia?.(QUERY);
  if (typeof media?.addEventListener !== 'function') return () => {};
  const listener = (event: { matches: boolean }) =>
    onChange(event.matches ? 'dark' : 'light');
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};

export const persist = (
  key: string = 'theme',
): { get(): Scheme; set(scheme: Scheme): void } => {
  assertKey(key);
  return {
    get() {
      try {
        const stored = env().localStorage?.getItem(key);
        return stored === 'light' || stored === 'dark' ? stored : 'system';
      } catch {
        return 'system';
      }
    },
    set(scheme) {
      assertScheme(scheme);
      try {
        env().localStorage?.setItem(key, scheme);
      } catch {
        return;
      }
    },
  };
};

export const themeScript = (key: string = 'theme'): string =>
  `(function(){try{var s;try{s=localStorage.getItem(${JSON.stringify(assertKey(key))})}catch(_){}var d=false;try{d=s==="dark"||(s!=="light"&&matchMedia(${JSON.stringify(QUERY)}).matches)}catch(_){}var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;

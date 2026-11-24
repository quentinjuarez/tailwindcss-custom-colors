import { runInNewContext } from 'node:vm';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyScheme,
  persist,
  themeScript,
  watchScheme,
  type SchemeTarget,
} from '../src/runtime.js';

const fakeElement = () => {
  const classes = new Set<string>();
  const el: SchemeTarget & { classes: Set<string> } = {
    classes,
    classList: {
      toggle: (name: string, force?: boolean) => {
        const on = force ?? !classes.has(name);
        if (on) classes.add(name);
        else classes.delete(name);
        return on;
      },
    },
    style: { colorScheme: '' },
  };
  return el;
};

const fakeMedia = (dark: boolean) => {
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const query = {
    matches: dark,
    addEventListener: vi.fn((_: string, fn: never) => listeners.add(fn)),
    removeEventListener: vi.fn((_: string, fn: never) => listeners.delete(fn)),
  };
  const matchMedia = vi.fn(() => query);
  return { matchMedia, query, listeners };
};

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('applyScheme', () => {
  it('applies dark and light explicitly', () => {
    const el = fakeElement();
    expect(applyScheme('dark', el)).toBe('dark');
    expect(el.classes.has('dark')).toBe(true);
    expect(el.style.colorScheme).toBe('dark');
    expect(applyScheme('light', el)).toBe('light');
    expect(el.classes.has('dark')).toBe(false);
    expect(el.style.colorScheme).toBe('light');
  });

  it('resolves system from matchMedia', () => {
    for (const dark of [true, false]) {
      vi.stubGlobal('matchMedia', fakeMedia(dark).matchMedia);
      const el = fakeElement();
      expect(applyScheme('system', el)).toBe(dark ? 'dark' : 'light');
      expect(el.classes.has('dark')).toBe(dark);
    }
  });

  it('treats system as light without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(applyScheme('system', fakeElement())).toBe('light');
  });

  it('defaults to document.documentElement', () => {
    const el = fakeElement();
    vi.stubGlobal('document', { documentElement: el });
    applyScheme('dark');
    expect(el.classes.has('dark')).toBe(true);
  });

  it('throws without an element and without a document', () => {
    vi.stubGlobal('document', undefined);
    expect(() => applyScheme('dark')).toThrow(
      'applyScheme() needs an element when no global document is available',
    );
  });

  it('rejects invalid schemes', () => {
    for (const bad of ['auto', undefined, null, 1, '']) {
      expect(() => applyScheme(bad as never, fakeElement())).toThrow(
        /^Invalid scheme: .*\. Expected 'light', 'dark' or 'system'$/,
      );
    }
  });
});

describe('watchScheme', () => {
  it('forwards changes and unsubscribes', () => {
    const media = fakeMedia(false);
    vi.stubGlobal('matchMedia', media.matchMedia);
    const cb = vi.fn();
    const stop = watchScheme(cb);
    expect(media.listeners.size).toBe(1);
    expect(media.query.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    for (const fn of media.listeners) {
      fn({ matches: true });
      fn({ matches: false });
    }
    expect(cb.mock.calls).toEqual([['dark'], ['light']]);
    stop();
    stop();
    expect(media.listeners.size).toBe(0);
  });

  it('returns a no-op when the query lacks addEventListener', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(() => watchScheme(vi.fn())()).not.toThrow();
  });

  it('returns a no-op without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    const stop = watchScheme(vi.fn());
    expect(() => stop()).not.toThrow();
  });
});

describe('persist', () => {
  it('round trips every scheme under the default key', () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
    const store = persist();
    for (const scheme of ['light', 'dark', 'system'] as const) {
      store.set(scheme);
      expect(storage.data.theme).toBe(scheme);
      expect(store.get()).toBe(scheme);
    }
  });

  it('uses a custom key', () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
    persist('my.key').set('dark');
    expect(storage.data['my.key']).toBe('dark');
  });

  it('falls back to system on a missing or garbage value', () => {
    vi.stubGlobal('localStorage', fakeStorage({ theme: 'zzz' }));
    expect(persist().get()).toBe('system');
    vi.stubGlobal('localStorage', fakeStorage());
    expect(persist().get()).toBe('system');
  });

  it('survives broken storage', () => {
    const boom = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom });
    const store = persist();
    expect(store.get()).toBe('system');
    expect(() => store.set('dark')).not.toThrow();
    vi.stubGlobal('localStorage', undefined);
    expect(store.get()).toBe('system');
    expect(() => store.set('dark')).not.toThrow();
  });

  it('rejects an invalid scheme on set', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(() => persist().set('auto' as never)).toThrow('Invalid scheme');
  });
});

describe('storage keys', () => {
  const bad = ['', 'a'.repeat(65), 'a b', '</script>', "x'y", 1];

  it('are validated by persist and themeScript', () => {
    for (const key of bad) {
      expect(() => persist(key as never)).toThrow('Invalid storage key');
      expect(() => themeScript(key as never)).toThrow('Invalid storage key');
    }
  });

  it('accepts a 64 character key', () => {
    expect(() => themeScript('a'.repeat(64))).not.toThrow();
  });
});

describe('themeScript', () => {
  const run = (stored: string | null, dark: boolean, key = 'k') => {
    const el = fakeElement();
    runInNewContext(themeScript(key), {
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: dark }),
      document: { documentElement: el },
    });
    return { dark: el.classes.has('dark'), colorScheme: el.style.colorScheme };
  };

  it('matches applyScheme for every stored value and preference', () => {
    for (const stored of ['light', 'dark', 'system', null, 'zzz']) {
      for (const dark of [true, false]) {
        vi.stubGlobal('matchMedia', fakeMedia(dark).matchMedia);
        vi.stubGlobal(
          'localStorage',
          fakeStorage(stored === null ? {} : { k: stored }),
        );
        const el = fakeElement();
        applyScheme(persist('k').get(), el);
        expect(run(stored, dark)).toEqual({
          dark: el.classes.has('dark'),
          colorScheme: el.style.colorScheme,
        });
      }
    }
  });

  it('follows the OS when storage throws, like applyScheme', () => {
    for (const dark of [true, false]) {
      const el = fakeElement();
      runInNewContext(themeScript(), {
        localStorage: {
          getItem: () => {
            throw new Error('denied');
          },
        },
        matchMedia: () => ({ matches: dark }),
        document: { documentElement: el },
      });
      expect(el.classes.has('dark')).toBe(dark);
      expect(el.style.colorScheme).toBe(dark ? 'dark' : 'light');
    }
  });

  it('matches applyScheme without matchMedia', () => {
    for (const stored of ['dark', 'light', null]) {
      const el = fakeElement();
      runInNewContext(themeScript(), {
        localStorage: { getItem: () => stored },
        document: { documentElement: el },
      });
      expect(el.classes.has('dark')).toBe(stored === 'dark');
      expect(el.style.colorScheme).toBe(stored === 'dark' ? 'dark' : 'light');
    }
  });

  it('never throws without any browser globals', () => {
    expect(() => runInNewContext(themeScript(), {})).not.toThrow();
  });

  it('is one line and cannot close a script tag', () => {
    const script = themeScript();
    expect(script).not.toMatch(/\n/);
    expect(script).not.toContain('</');
  });
});

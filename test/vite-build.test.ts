import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import { build, createServer, type Plugin, type Rollup } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { customColors } from '../src/vite.js';

const CACHE = join(process.cwd(), 'node_modules', '.cache');

let dir: string;

beforeEach(() => {
  mkdirSync(CACHE, { recursive: true });
  dir = mkdtempSync(join(CACHE, 'tcc-vite-build-'));
  writeFileSync(
    join(dir, 'app.css'),
    `@import 'tailwindcss/utilities';\n@import 'virtual:theme.css';\n@source inline("bg-primary-500");\n`,
  );
  writeFileSync(join(dir, 'entry.js'), `import './app.css';\n`);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const bundle = async (plugins: Plugin[]): Promise<string> => {
  const result = (await build({
    root: dir,
    configFile: false,
    logLevel: 'silent',
    plugins,
    build: {
      write: false,
      rollupOptions: { input: join(dir, 'entry.js') },
    },
  })) as Rollup.RollupOutput | Rollup.RollupOutput[];
  const { output } = Array.isArray(result) ? result[0]! : result;
  return output
    .filter((chunk) => chunk.fileName.endsWith('.css'))
    .map((chunk) => (chunk as Rollup.OutputAsset).source as string)
    .join('\n');
};

const plugin = (options: Parameters<typeof customColors>[0]) =>
  customColors(options) as unknown as Plugin;

describe('vite build with tailwind', () => {
  it('generates utilities from a theme that only exists in the plugin', async () => {
    const css = await bundle([
      plugin({ colors: { primary: '#940BDF' } }),
      ...tailwindcss(),
    ]);
    expect(css).toMatch(/\.bg-primary-500\s*\{[^}]*var\(--primary-500\)/);
    expect(css).toContain('--primary-500:oklch(52.77%');
  });

  it('must be listed before tailwindcss()', async () => {
    await expect(
      bundle([...tailwindcss(), plugin({ colors: { primary: '#940BDF' } })]),
    ).rejects.toThrow("Can't resolve 'virtual:theme.css'");
  });

  it('goes through the Lightning CSS fallback with light-dark', async () => {
    const css = await bundle([
      plugin({ colors: { primary: '#940BDF' }, dark: 'light-dark' }),
      ...tailwindcss(),
    ]);
    expect(css).not.toContain('light-dark(');
    expect(css).toContain('--lightningcss-light');
    expect(css).toContain('--lightningcss-dark');
    expect(css).toMatch(/\.light\s*\{[^}]*--lightningcss-light/);
    expect(css).toMatch(/\.dark\s*\{[^}]*--lightningcss-dark/);
    expect(css).toMatch(/\.bg-primary-500\s*\{[^}]*var\(--primary-500\)/);
  });

  it('honors the theme options', async () => {
    const css = await bundle([
      plugin({ colors: { primary: '#940BDF' }, dark: 'class' }),
      ...tailwindcss(),
    ]);
    expect(css).toContain('.dark{');
  });

  it('serves the theme to a plain javascript import', async () => {
    writeFileSync(
      join(dir, 'entry.js'),
      `import 'virtual:theme.css';\nimport './app.css';\n`,
    );
    const css = await bundle([
      plugin({ colors: { primary: '#940BDF' } }),
      ...tailwindcss(),
    ]);
    expect(css).toContain('--primary-500:oklch(52.77%');
  });

  it('reads a colors file and picks up a rewrite', async () => {
    const file = join(dir, 'colors.json');
    writeFileSync(file, JSON.stringify({ primary: '#940BDF' }));
    const first = await bundle([
      plugin({ colors: 'colors.json' }),
      ...tailwindcss(),
    ]);
    writeFileSync(file, JSON.stringify({ primary: '#0B6FDF' }));
    const second = await bundle([
      plugin({ colors: 'colors.json' }),
      ...tailwindcss(),
    ]);
    expect(first).toContain('--primary-500:oklch(52.77%');
    expect(second).not.toBe(first);
    expect(second).not.toContain('--primary-500:oklch(52.77%');
    expect(second).toMatch(/\.bg-primary-500\s*\{[^}]*var\(--primary-500\)/);
  });
});

describe('vite dev server', () => {
  it(
    'serves the theme and refreshes it when the colors file changes',
    { timeout: 20000 },
    async () => {
      const file = join(dir, 'colors.json');
      writeFileSync(file, JSON.stringify({ primary: '#940BDF' }));
      const server = await createServer({
        root: dir,
        configFile: false,
        logLevel: 'silent',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false },
        plugins: [plugin({ colors: 'colors.json' }), ...tailwindcss()],
      });
      try {
        const read = async () =>
          (await server.transformRequest('/app.css'))?.code ?? '';
        const first = await read();
        expect(first).toContain('--primary-500: oklch(0.5277');
        expect(first).toContain('bg-primary-500');

        writeFileSync(file, JSON.stringify({ primary: '#0B6FDF' }));
        server.watcher.emit('change', file);
        let second = first;
        for (let i = 0; i < 50 && second === first; i += 1) {
          await new Promise((done) => setTimeout(done, 50));
          second = await read();
        }
        expect(second).not.toBe(first);
        expect(second).not.toContain('--primary-500: oklch(0.5277');
      } finally {
        await server.close();
      }
    },
  );
});

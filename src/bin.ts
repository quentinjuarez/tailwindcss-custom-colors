#!/usr/bin/env node
import { run, type CliResult } from './cli.js';
import { watchFile } from './watch.js';

const argv = process.argv.slice(2);

const print = ({ stdout, stderr }: CliResult): void => {
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
};

const reasonOf = (error: unknown): string =>
  (error as NodeJS.ErrnoException).code ??
  ((error as Error).message ?? String(error)).split('\n')[0]!;

const watch = (configPath: string, firstWrote: string): void => {
  const fail = (error: unknown): void => {
    process.stderr.write(`Cannot watch ${configPath}: ${reasonOf(error)}\n`);
    process.exitCode = 1;
  };
  let close = (): void => {};
  try {
    close = watchFile(
      configPath,
      () => {
        const next = run(argv);
        print(next);
        if (next.code === 0 && next.wrote !== undefined) {
          process.stdout.write(`Wrote ${next.wrote}\n`);
        }
      },
      (error) => {
        fail(error);
        close();
      },
    );
  } catch (error) {
    fail(error);
    return;
  }
  process.stdout.write(`Wrote ${firstWrote}\n`);
  process.stdout.on('error', close);
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
};

const first = run(argv);
print(first);
process.exitCode = first.code;

if (first.watch !== undefined && first.wrote !== undefined) {
  watch(first.watch, first.wrote);
}

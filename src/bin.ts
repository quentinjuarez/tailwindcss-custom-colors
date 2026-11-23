#!/usr/bin/env node
import { run } from './cli.js';

const { stdout, stderr, code } = run(process.argv.slice(2));

if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);
process.exitCode = code;

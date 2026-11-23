const IDENTIFIER = /^[\p{L}\p{N}_-]+$/u;
const RESERVED_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

export function assertColorName(name: string): void {
  if (typeof name !== 'string' || !IDENTIFIER.test(name)) {
    throw new Error(`Invalid color name: ${String(name)}`);
  }
}

export function assertConfigKey(name: string): void {
  assertColorName(name);
  if (RESERVED_NAMES.has(name)) {
    throw new Error(`Reserved color name: ${name}`);
  }
}

const IDENTIFIER = /^[\p{L}\p{N}_-]+$/u;
const TINT = /^[A-Za-z0-9_.-]+$/;
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

export function assertVariablePrefix(prefix: string): void {
  if (typeof prefix !== 'string' || !IDENTIFIER.test(prefix)) {
    throw new Error(`Invalid variable prefix: ${String(prefix)}`);
  }
}

function assertTint(tint: string): void {
  if (typeof tint !== 'string' || !TINT.test(tint)) {
    throw new Error(`Invalid tint: ${String(tint)}`);
  }
}

export default function variableName(
  name: string,
  prefix?: string,
  tint?: string,
): string {
  assertColorName(name);
  if (prefix) assertVariablePrefix(prefix);
  if (tint) assertTint(tint);

  return `--${prefix ? prefix + '-' : ''}${name}${tint ? '-' + tint : ''}`;
}

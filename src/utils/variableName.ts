export default function variableName(
  name: string,
  prefix?: string,
  tint?: string,
): string {
  return `--${prefix ? prefix + "-" : ""}${name}${tint ? "-" + tint : ""}`;
}

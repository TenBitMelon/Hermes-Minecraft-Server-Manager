// Stands in for $env/dynamic/private under Vitest. Tests assign the keys they need.
export const env: Record<string, string | undefined> = {};

export function resetEnv() {
  for (const key of Object.keys(env)) delete env[key];
}

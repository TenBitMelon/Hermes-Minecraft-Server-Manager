import { env as privateEnv } from '$env/dynamic/private';

export type HermesRuntimeRole = 'control' | 'worker' | 'hybrid';

export function getHermesRuntimeRole(): HermesRuntimeRole {
  const value = (privateEnv.HERMES_RUNTIME_ROLE || 'hybrid').toLowerCase();
  if (value === 'control' || value === 'worker' || value === 'hybrid') return value;
  return 'hybrid';
}

export function canRunControlPlane() {
  return getHermesRuntimeRole() !== 'worker';
}

export function canHostLocalWorker() {
  return getHermesRuntimeRole() !== 'control';
}

export function getWorkerAuthToken() {
  return privateEnv.HERMES_WORKER_API_TOKEN || '';
}

export function getWorkerOfflineThresholdMs() {
  const seconds = Number(privateEnv.HERMES_WORKER_OFFLINE_AFTER_SECONDS || '120');
  if (Number.isNaN(seconds) || seconds <= 0) return 120_000;
  return seconds * 1000;
}

export function getWorkerRestartingThresholdMs() {
  const seconds = Number(privateEnv.HERMES_WORKER_RESTARTING_AFTER_SECONDS || '45');
  if (Number.isNaN(seconds) || seconds <= 0) return 45_000;
  return seconds * 1000;
}

export function getWorkerRequestTimeoutMs() {
  const milliseconds = Number(privateEnv.HERMES_WORKER_REQUEST_TIMEOUT_MS || '30000');
  if (Number.isNaN(milliseconds) || milliseconds <= 0) return 30_000;
  return milliseconds;
}

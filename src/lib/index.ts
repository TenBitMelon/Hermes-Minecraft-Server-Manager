import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import { words } from '$assets/words.json';
import { env } from '$env/dynamic/private';
import { dev, building } from '$app/environment';
import PocketBase from 'pocketbase';

const serverPB = new PocketBase(!building ? (dev ? 'http://127.0.0.1:8090' : 'http://0.0.0.0:8090') : '');
serverPB.autoCancellation(false);
try {
  console.log(`Authenticating with PocketBase using email: ${env.POCKETBASE_INTERNAL_ADMIN_EMAIL} password: ${env.POCKETBASE_INTERNAL_ADMIN_PASSWORD}`);
  serverPB.admins.authWithPassword(env.POCKETBASE_INTERNAL_ADMIN_EMAIL, env.POCKETBASE_INTERNAL_ADMIN_PASSWORD);
  console.log('Authenticated with PocketBase');
} catch (e) {
  console.log('Failed to authenticate with PocketBase (thats not good)');
}
export { serverPB };

export function timeUntil(date: Date | string | number | null) {
  if (date == null) return 'never';
  return dayjs(date).fromNow();
}

export function formDataObject(formData: FormData) {
  const object: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size === 0) continue;
    if (object[key] !== undefined) {
      if (!Array.isArray(object[key])) object[key] = [object[key]];
      object[key].push(value);
    } else object[key] = value;
  }
  return object;
}

export function objectFormData(object: Record<string, unknown>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(object)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, item == null ? '' : item);
      }
    } else formData.append(key, value == null ? '' : value);
  }
  return formData;
}

export function randomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import { words } from '$assets/words.json';
import { env as penv } from '$env/dynamic/public';
import { ServerState } from './database/types';
import { Err, Result } from 'neverthrow';

export type NotNull<T> = T extends null ? never : T;

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
      (object as any)[key].push(value);
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
    } else formData.append(key, value == null ? '' : (value as any));
  }
  return formData;
}

export function randomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

export function getFileURL(collectionID: string, recordID: string, filename: string) {
  if (!collectionID || !recordID || !filename) return penv.PUBLIC_DEFAULT_ICON_URL;
  return `/api/file?collectionID=${collectionID}&recordID=${recordID}&filename=${filename}`;
}

export function stateDisplay(state: ServerState): { indicatorColor: string; message: string } {
  switch (state) {
    case ServerState.Creating:
      return {
        indicatorColor: 'bg-yellow-500',
        message: 'Creating the Server...'
      };
    case ServerState.Running:
      return {
        indicatorColor: 'bg-green-500',
        message: 'Online'
      };
    case ServerState.Stopped:
      return {
        indicatorColor: 'bg-red-500',
        message: 'Offline'
      };
    case ServerState.Paused:
      return {
        indicatorColor: 'bg-lime-500',
        message: 'Online˜'
      };
  }
}

interface PromiseReject<T, E> extends Promise<T> {
  new <T, E = any>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: E) => void) => void): PromiseReject<T, E>;
}

export function resultToPromise<T, E>(r: Result<T, E>): PromiseReject<T, E> {
  return (r.isOk() ? Promise.resolve(r.value) : Promise.reject(r.error)) as PromiseReject<T, E>;
}

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export function timeUntil(date: Date | string | number) {
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

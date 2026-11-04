import { AsyncLocalStorage } from 'node:async_hooks';

const owner = new AsyncLocalStorage<string>();
const pending = new Map<string, Promise<unknown>>();

export function withServerOperation<T>(serverID: string, operation: () => Promise<T>): Promise<T> {
  if (owner.getStore() === serverID) return operation();
  const previous = pending.get(serverID) || Promise.resolve();
  const result = previous.then(() => owner.run(serverID, operation));
  const settled = result.then(
    () => undefined,
    () => undefined
  );
  pending.set(serverID, settled);
  void settled.then(() => {
    if (pending.get(serverID) === settled) pending.delete(serverID);
  });
  return result;
}

let previous: Promise<unknown> = Promise.resolve();
export function serializeServerCreation<T>(create: () => Promise<T>): Promise<T> {
  const result = previous.then(create, create);
  previous = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

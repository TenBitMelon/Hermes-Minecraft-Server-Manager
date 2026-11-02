import { serializeServerCreation, withServerOperation } from '$lib/servers/operationLock';
import { expect, it } from 'vitest';

it('a restart waits for an in-flight reconciliation instead of being stopped by it', async () => {
  const events: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const reconcile = withServerOperation('same-server', async () => {
    events.push('reconcile');
    await gate;
    events.push('stopped');
  });
  const restart = withServerOperation('same-server', async () => {
    events.push('started');
  });
  await Promise.resolve();
  expect(events).toEqual(['reconcile']);
  release();
  await Promise.all([reconcile, restart]);
  expect(events).toEqual(['reconcile', 'stopped', 'started']);
});

it('independent servers proceed while one host operation is blocked', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const blocked = withServerOperation('worker-a-server', () => gate);
  await expect(withServerOperation('worker-b-server', async () => 'healthy')).resolves.toBe('healthy');
  release();
  await blocked;
});

it('nested lifecycle calls are reentrant and failures release the server', async () => {
  await expect(withServerOperation('reentrant', () => withServerOperation('reentrant', async () => 'done'))).resolves.toBe('done');
  await expect(
    withServerOperation('reentrant', async () => {
      throw new Error('offline');
    })
  ).rejects.toThrow('offline');
  await expect(withServerOperation('reentrant', async () => 'recovered')).resolves.toBe('recovered');
});

it('rechecks a quota after a competing creation commits', async () => {
  let owned = 0;
  const create = () =>
    serializeServerCreation(async () => {
      if (owned >= 1) return false;
      await Promise.resolve();
      owned++;
      return true;
    });
  expect(await Promise.all([create(), create()])).toEqual([true, false]);
  expect(owned).toBe(1);
});

it('a failed provisioning operation does not block later attempts', async () => {
  await expect(
    serializeServerCreation(async () => {
      throw new Error('provisioning failed');
    })
  ).rejects.toThrow('provisioning failed');
  await expect(serializeServerCreation(async () => 'recovered')).resolves.toBe('recovered');
});

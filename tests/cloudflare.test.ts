import { afterEach, describe, expect, it, vi } from 'vitest';
import { env, resetEnv } from './stubs/private-env';
import { addCloudflareRecords, removeCloudflareRecords, removeCloudflareCNAMERecord, removeCloudflareSRVRecord } from '$lib/cloudflare';

vi.mock('$app/environment', () => ({ dev: false, building: false }));

afterEach(() => {
  resetEnv();
  vi.unstubAllGlobals();
});

describe('DNS automation configuration', () => {
  it('never contacts Cloudflare for creation or deletion when explicitly disabled', async () => {
    env.HERMES_DNS_MODE = 'disabled';
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await addCloudflareRecords('lab', 25565))._unsafeUnwrap()).toEqual({ cname: '<DISABLED>', srv: '<DISABLED>' });
    expect((await removeCloudflareRecords('<DISABLED>', '<DISABLED>')).isOk()).toBe(true);
    expect((await removeCloudflareCNAMERecord('<DISABLED>')).isOk()).toBe(true);
    expect((await removeCloudflareSRVRecord('<DISABLED>')).isOk()).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retains Cloudflare behavior by default', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, result: { id: 'record' } }) });
    vi.stubGlobal('fetch', fetch);
    expect((await addCloudflareRecords('lab', 25565)).isOk()).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects misspelled DNS modes rather than silently disabling DNS', async () => {
    env.HERMES_DNS_MODE = 'disabeld';
    await expect(addCloudflareRecords('lab', 25565)).rejects.toThrow('HERMES_DNS_MODE');
  });
});

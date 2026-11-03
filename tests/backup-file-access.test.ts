import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getOne: vi.fn(), getToken: vi.fn(), getUrl: vi.fn(), requireCapability: vi.fn(), requireAdmin: vi.fn() }));
vi.mock('$lib/database/index.js', () => ({ serverPB: { collection: () => ({ getOne: mocks.getOne }), files: { getToken: mocks.getToken, getUrl: mocks.getUrl } } }));
vi.mock('$lib/server/auth', () => ({ isAdmin: (user: { administrator?: boolean } | null) => Boolean(user?.administrator), requireAdministrator: mocks.requireAdmin, requireServerCapability: mocks.requireCapability }));
import { GET } from '../src/routes/api/file/+server';

function request(user: { administrator: boolean } | null) {
  return { url: new URL('http://localhost/api/file?collectionID=backups-id&recordID=backup-id&filename=world.zip'), locals: { user } } as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getOne.mockRejectedValueOnce(new Error('No server')).mockResolvedValueOnce({ collectionId: 'backups-id', serverID: 'deleted-server' });
  mocks.getToken.mockResolvedValue('file-token');
  mocks.getUrl.mockReturnValue('http://localhost:8090/protected-backup');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('backup', { headers: { 'content-type': 'application/zip' } })));
});

describe('historical backup access', () => {
  it('allows administrators to download a backup after its server was deleted', async () => {
    const response = await GET(request({ administrator: true }));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('backup');
    expect(mocks.requireCapability).not.toHaveBeenCalled();
    expect(mocks.getToken).toHaveBeenCalledOnce();
  });

  it.each([{ administrator: false }, null])('still requires server access for a non-administrator: %s', async (user) => {
    const denied = new Error('No server access');
    mocks.requireCapability.mockRejectedValue(denied);
    await expect(GET(request(user))).rejects.toBe(denied);
    expect(mocks.requireCapability).toHaveBeenCalledWith('deleted-server', { user }, 'canViewDashboard');
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.getToken).not.toHaveBeenCalled();
  });
});

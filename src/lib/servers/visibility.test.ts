import { describe, expect, it } from 'vitest';
import type { ServerResponse } from '$lib/database/types';
import { withoutInternalFields } from './visibility';

function server(): ServerResponse {
  return {
    id: 'srv_1',
    collectionId: '80olb9b23s3qall',
    collectionName: 'servers',
    title: 'Survival',
    subdomain: 'survival',
    port: 30000,
    worker: 'wrk_1',
    owner: 'usr_owner',
    icon: 'icon.png',
    gameVersion: '1.21',
    serverSoftware: 'PAPER',
    worldType: 'flat',
    state: 'running',
    startDate: null,
    shutdownDate: null,
    deletionDate: null,
    timeToLive: '12_hr',
    canBeDeleted: true,
    serverFilesMissing: false,
    createdBy: 'usr_owner',
    created: '2026-03-20 20:30:00.000Z',
    updated: '2026-03-20 20:30:00.000Z'
  } as unknown as ServerResponse;
}

describe('withoutInternalFields', () => {
  it('strips the owner and the port numbers', () => {
    const publicServer = withoutInternalFields(server());

    expect(publicServer).not.toHaveProperty('owner');
    expect(publicServer).not.toHaveProperty('port');
  });

  it('strips the worker relation id', () => {
    expect(withoutInternalFields(server())).not.toHaveProperty('worker');
  });

  it('strips the Cloudflare record ids', () => {
    const publicServer = withoutInternalFields(server());

    expect(publicServer).not.toHaveProperty('cloudflareCNAMERecordID');
    expect(publicServer).not.toHaveProperty('cloudflareSRVRecordID');
  });

  it('keeps the fields the list actually renders', () => {
    const publicServer = withoutInternalFields(server());

    expect(publicServer.id).toBe('srv_1');
    expect(publicServer.title).toBe('Survival');
    expect(publicServer.subdomain).toBe('survival');
    expect(publicServer.icon).toBe('icon.png');
  });

  it('does not mutate the record it was given', () => {
    const original = server();
    withoutInternalFields(original);

    expect(original).toHaveProperty('owner', 'usr_owner');
    expect(original).toHaveProperty('port', 30000);
  });
});

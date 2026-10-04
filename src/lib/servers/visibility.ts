import type { ServerResponse } from '$lib/database/types';

export type InternalServerField = 'owner' | 'port' | 'workerPort' | 'worker' | 'cloudflareCNAMERecordID' | 'cloudflareSRVRecordID';

export type PublicServerResponse = Omit<ServerResponse, InternalServerField>;

// Hide these from the public server list
const internalServerFields: readonly InternalServerField[] = ['owner', 'port', 'workerPort', 'worker', 'cloudflareCNAMERecordID', 'cloudflareSRVRecordID'];

export function withoutInternalFields(server: ServerResponse): PublicServerResponse {
  return Object.fromEntries(Object.entries(server).filter(([key]) => !internalServerFields.includes(key as InternalServerField))) as PublicServerResponse;
}

import { dev } from '$app/environment';
import { env as privateENV } from '$env/dynamic/private';
import { env as publicENV } from '$env/dynamic/public';
import { ResultAsync, err, ok, type Result } from 'neverthrow';
import { CustomError } from './types';

type CloudflareApiError = {
  code?: number;
  message?: string;
};

type CloudflareApiResponse<T> = {
  success?: boolean;
  result?: T;
  errors?: CloudflareApiError[];
  messages?: { message?: string }[];
};

function createCloudflareError(message: string, responseBody?: CloudflareApiResponse<unknown>) {
  const providerMessages = [...(responseBody?.errors ?? []).map((error) => error.message), ...(responseBody?.messages ?? []).map((entry) => entry.message)].filter((value): value is string => typeof value === 'string' && value.trim().length > 0).join(' ');

  const duplicateRecord = (responseBody?.errors ?? []).some((error) => error.code === 81057 || /already exists/i.test(error.message ?? '')) || /already exists/i.test(providerMessages);
  if (duplicateRecord) {
    return new CustomError('That subdomain is already in use in Cloudflare. Pick a different subdomain.');
  }

  if (providerMessages) {
    return new CustomError(`${message} ${providerMessages}`.trim());
  }

  return new CustomError(message);
}

async function createCloudflareRecord<T extends { id: string }>(body: unknown, message: string): Promise<Result<T, CustomError>> {
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${privateENV.CLOUDFLARE_ZONE_ID}/dns_records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${privateENV.CLOUDFLARE_TOKEN}`
      },
      body: JSON.stringify(body)
    });

    const responseBody = (await response.json()) as CloudflareApiResponse<T>;
    if (!response.ok || !responseBody.success || !responseBody.result?.id) {
      return err(createCloudflareError(message, responseBody));
    }

    return ok(responseBody.result);
  } catch (error) {
    return err(CustomError.from(error, message));
  }
}

export async function addCloudflareRecords(subdomain: string, port: number): Promise<Result<{ cname: string; srv: string }, CustomError>> {
  if (dev) return ok({ cname: '<DEV>', srv: '<DEV>' });

  const createCNAMEResult = await createCloudflareRecord(
    {
      name: `${subdomain}.servers`,
      content: `${publicENV.PUBLIC_ROOT_DOMAIN}`,
      proxied: false,
      type: 'CNAME',
      comment: 'Created by Hermes Minecraft Server Manager',
      ttl: 3600
    },
    'Failed to create the Cloudflare CNAME record.'
  );
  if (createCNAMEResult.isErr()) return err(createCNAMEResult.error);

  const createSRVResult = await createCloudflareRecord(
    {
      type: 'SRV',
      name: `_minecraft._tcp.${subdomain}.${publicENV.PUBLIC_ROOT_DOMAIN}`,
      data: {
        priority: 0,
        weight: 5,
        port,
        target: `${subdomain}.${publicENV.PUBLIC_ROOT_DOMAIN}`
      },
      proxied: false,
      comment: 'Created by Hermes Minecraft Server Manager',
      ttl: 3600
    },
    'Failed to create SRV record for server.'
  );

  if (createSRVResult.isErr()) {
    await removeCloudflareCNAMERecord(createCNAMEResult.value.id);
    return err(createSRVResult.error);
  }

  return ok({
    cname: createCNAMEResult.value.id,
    srv: createSRVResult.value.id
  });
}

export async function removeCloudflareCNAMERecord(cnameID: string): Promise<Result<void, CustomError>> {
  if (dev) return ok(undefined);

  const deleteCNAMEResult = await ResultAsync.fromPromise(
    fetch(`https://api.cloudflare.com/client/v4/zones/${privateENV.CLOUDFLARE_ZONE_ID}/dns_records/${cnameID}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${privateENV.CLOUDFLARE_TOKEN}`
      }
    }),
    () => new CustomError('Failed to delete the CNAME record from Cloudflare')
  );
  return deleteCNAMEResult.map(() => undefined);
}
export async function removeCloudflareSRVRecord(srvID: string): Promise<Result<void, CustomError>> {
  if (dev) return ok(undefined);

  const deleteSRVResult = await ResultAsync.fromPromise(
    fetch(`https://api.cloudflare.com/client/v4/zones/${privateENV.CLOUDFLARE_ZONE_ID}/dns_records/${srvID}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${privateENV.CLOUDFLARE_TOKEN}`
      }
    }),
    () => new CustomError('Failed to delete the SRV record from Cloudflare')
  );
  return deleteSRVResult.map(() => undefined);
}

export async function removeCloudflareRecords(cnameID: string, srvID: string): Promise<Result<void, CustomError>> {
  if (dev) return ok(undefined);

  const deleteCNAMEResult = await removeCloudflareCNAMERecord(cnameID);
  if (deleteCNAMEResult.isErr()) return err(deleteCNAMEResult.error);

  const deleteSRVResult = await removeCloudflareSRVRecord(srvID);
  if (deleteSRVResult.isErr()) return err(deleteSRVResult.error);

  return ok(undefined);
}

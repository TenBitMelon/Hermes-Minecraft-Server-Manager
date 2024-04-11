import { env } from '$env/dynamic/private';
import { env as penv } from '$env/dynamic/public';
import { dev } from '$app/environment';
import { ResultAsync, type Result, err, ok, Err } from 'neverthrow';

enum CloudflareErrorType {
  a
}
class CloudflareError extends Error {
  constructor(message: string, cause: CloudflareErrorType) {
    super(message, { cause });
  }
}

export async function addServerRecords(subdomain: string, port: number): Promise<Result<{ cname: string; srv: string }, CloudflareError>> {
  if (dev) return ok({ cname: '', srv: '' });

  const createCNAMEResult = await ResultAsync.fromPromise<{ result: { id: string }; success: true }, CloudflareError>(
    fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CLOUDFLARE_TOKEN}`
      },
      body: JSON.stringify({
        name: `${subdomain}.servers`,
        content: `${penv.PUBLIC_ROOT_DOMAIN}`,
        proxied: false,
        type: 'CNAME',
        comment: 'Created by Hermes Minecraft Server Manager',
        ttl: 3600
      })
    }).then((r) => r.json()),
    () => new CloudflareError('Failed to create the Cloudflare CNAME record.', CloudflareErrorType.a)
  );
  if (createCNAMEResult.isErr()) return err(createCNAMEResult.error);

  const createSRVResult = await ResultAsync.fromPromise<{ result: { id: string }; success: true }, CloudflareError>(
    fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CLOUDFLARE_TOKEN}`
      },
      body: JSON.stringify({
        type: 'SRV',
        data: {
          service: '_minecraft',
          proto: '_tcp',
          name: `${subdomain}.${penv.PUBLIC_ROOT_DOMAIN}`,
          priority: 0,
          weight: 5,
          port,
          target: `${subdomain}.${penv.PUBLIC_ROOT_DOMAIN}`
        },
        proxied: false,
        comment: 'Created by Hermes Minecraft Server Manager',
        ttl: 3600
      })
    }).then((r) => r.json()),
    () => new CloudflareError('', CloudflareErrorType.a)
  );
  if (createSRVResult.isErr()) return err(createSRVResult.error);

  return ok({
    cname: createCNAMEResult.value.result.id,
    srv: createSRVResult.value.result.id
  });
}

// TODO: Remove server records
export async function removeServerRecords(cnameID: string, srvID: string): Promise<Result<void, Error>> {
  if (dev) return ok(undefined);

  const deleteCNAMEResult = await ResultAsync.fromPromise(
    fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records/${cnameID}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CLOUDFLARE_TOKEN}`
      }
    }),
    () => new Error('Failed to delete the CNAME record from Cloudflare')
  );
  if (deleteCNAMEResult.isErr()) return err(deleteCNAMEResult.error);

  const deleteSRVResult = await ResultAsync.fromPromise(
    fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records/${srvID}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.CLOUDFLARE_TOKEN}`
      }
    }),
    () => new Error('Failed to delete the SRV record from Cloudflare')
  );
  return deleteSRVResult.map(() => {
    //
  });
}

import { env } from '$env/dynamic/private';
import { env as penv } from '$env/dynamic/public';

export async function addServerRecords(subdomain: string, port: number) {
  return (
    await Promise.allSettled([
      fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.CLOUDFLARE_TOKEN}`
        },
        body: JSON.stringify({
          name: `${subdomain}`,
          content: `${penv.PUBLIC_ROOT_DOMAIN}`,
          proxied: false,
          type: 'CNAME',
          comment: 'Created by Hermes Minecraft Server Manager',
          ttl: 3600
        })
      }).catch((err) => console.error(err)),

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
      }).catch((err) => console.error(err))
    ])
  ).every((r) => r.status === 'fulfilled');
}

import { CLOUDFLARE_TOKEN, CLOUDFLARE_ZONE_ID } from '$env/static/private';
import { PUBLIC_ROOT_DOMAIN } from '$env/static/public';

export async function addServerRecords(subdomain: string, port: number) {
  return (
    await Promise.allSettled([
      fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CLOUDFLARE_TOKEN}`
        },
        body: JSON.stringify({
          name: `${subdomain}`,
          content: `${PUBLIC_ROOT_DOMAIN}`,
          proxied: false,
          type: 'CNAME',
          comment: 'Created by Hermes Minecraft Server Manager',
          ttl: 3600
        })
      }).catch((err) => console.error(err)),

      fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CLOUDFLARE_TOKEN}`
        },
        body: JSON.stringify({
          type: 'SRV',
          data: {
            service: '_minecraft',
            proto: '_tcp',
            name: `${subdomain}.${PUBLIC_ROOT_DOMAIN}`,
            priority: 0,
            weight: 5,
            port,
            target: `${subdomain}.${PUBLIC_ROOT_DOMAIN}`
          },
          proxied: false,
          comment: 'Created by Hermes Minecraft Server Manager',
          ttl: 3600
        })
      }).catch((err) => console.error(err))
    ])
  ).every((r) => r.status === 'fulfilled');
}

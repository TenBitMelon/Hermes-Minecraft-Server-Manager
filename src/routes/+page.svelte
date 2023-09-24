<script lang="ts">
  import { env } from '$env/dynamic/public';
  import { timeUntil } from '$lib';

  import type { PageServerData } from './$types';
  export let data: PageServerData;
</script>

<div class="flex w-full items-center">
  <div class="h-px w-full bg-gray-800" />
  <div class="mx-4 whitespace-nowrap text-sm font-thin">Servers</div>
  <div class="h-px w-full bg-gray-800" />
</div>

{#each data.servers as server}
  <a class="my-2 flex w-full max-w-2xl flex-col rounded-md bg-gray-800" href={`/${server.id}`} data-sveltekit-preload-data="false">
    {#if server.shutdown}
      <div class="flex w-full items-center justify-between bg-red-800 p-1 px-4">
        Will be deleted {server.deletionDate ? timeUntil(server.deletionDate) : '...'}
        <button class="rounded-sm bg-green-600 p-1 px-3">Revive</button>
      </div>
    {/if}
    <div class="flex gap-4 p-4">
      <img class="pixelated aspect-square h-24 rounded-sm" src={server.icon} alt="Server Icon" />
      <div>
        <h2 class="text-xl font-bold">
          {server.title}
          <span class="px-2 text-sm font-thin text-gray-400">{server.id}</span>
        </h2>
        <p class="">{server.gameVersion} {server.serverSoftware} {server.worldType} world</p>
        <button class="font-bold" on:click={() => navigator.clipboard.writeText(`${server.subdomain}.${env.PUBLIC_ROOT_DOMAIN}`)}>{server.subdomain}.{env.PUBLIC_ROOT_DOMAIN}</button>
        <div class="mt-2 flex items-center gap-2">
          <div class={`h-3 w-3 rounded-full ${!server.shutdown ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <p class="text-sm font-medium">{!server.shutdown ? 'Online' : 'Offline'}</p>
          <div class="text-sm font-thin text-gray-400">{server.serverHasGoneMissing ? 'um.. the server files are missing' : ''}</div>
        </div>
      </div>
    </div>
  </a>
{/each}
{#if data.servers.length === 0}
  <p class="text-center">No servers available</p>
{/if}

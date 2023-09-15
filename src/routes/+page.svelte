<script lang="ts">
  import { PUBLIC_ROOT_DOMAIN } from '$env/static/public';
  import { timeUntil } from '$lib';

  import type { PageServerData } from './$types';
  export let data: PageServerData;
</script>

<div class="flex w-full items-center">
  <div class="bg-gray-800 h-px w-full" />
  <div class="mx-4 whitespace-nowrap text-sm font-thin">Servers</div>
  <div class="bg-gray-800 h-px w-full" />
</div>

{#each data.servers as server}
  <a class="bg-gray-800 my-2 flex w-full max-w-2xl flex-col rounded-md" href={`/${server.id}`}>
    {#if server.shutdown}
      <div class="bg-red-800 flex w-full items-center justify-between p-1 px-4">
        Will be deleted {server.deletionDate ? timeUntil(server.deletionDate) : '...'}
        <button class="bg-green-600 rounded-sm p-1 px-3">Revive</button>
      </div>
    {/if}
    <div class="flex gap-4 p-4">
      <img class="pixelated aspect-square h-24 rounded-sm" src={server.icon} alt="Server Icon" />
      <div>
        <h2 class="text-xl font-bold">
          {server.title}
          <span class="text-gray-400 px-2 text-sm font-thin">{server.id}</span>
        </h2>
        <p class="">{server.gameVersion} {server.serverSoftware} {server.worldType} world</p>
        <p class="">{server.subdomain}.{PUBLIC_ROOT_DOMAIN}</p>
      </div>
    </div>
  </a>
{/each}

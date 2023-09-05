<script lang="ts">
  import { timeUntil } from '$lib';

  import type { PageServerData } from './$types';
  export let data: PageServerData;
</script>

<div class="flex w-full items-center justify-between gap-4">
  <h1 class="text-3xl font-black">Hermes</h1>
  <a href="/create" class="rounded-md bg-blue-300 p-2 px-4 text-lg font-bold">Create</a>
</div>

<div class="flex w-full items-center">
  <div class="h-px w-full bg-gray-200" />
  <div class="mx-4 whitespace-nowrap text-sm font-thin">Online Servers</div>
  <div class="h-px w-full bg-gray-200" />
</div>

{#each data.servers as server}
  <div class="my-2 flex w-full max-w-lg gap-2 rounded-md bg-gray-200 p-4">
    <img class="aspect-square h-full rounded-sm" src={server.icon} alt="Server Icon" />
    <div>
      <h2 class="text-xl font-bold">{server.title}</h2>
      <p class="">{server.gameVersion} {server.serverSoftware} {server.worldType} world</p>
      <p class="">{server.subdomain}.servers.craftingcomrades.net</p>
    </div>
  </div>
{/each}
<div class="flex w-full items-center">
  <div class="h-px w-full bg-gray-200" />
  <div class="mx-4 whitespace-nowrap text-sm font-thin">Recently Stopped Servers</div>
  <div class="h-px w-full bg-gray-200" />
</div>
{#each data.shutdownServers as server}
  <div class="my-2 flex w-full max-w-lg flex-col rounded-md bg-gray-200">
    <div class="flex w-full items-center justify-between bg-red-300 p-1 px-4">
      <!-- {server.deletionDate} -->
      Will be deleted {server.deletionDate ? timeUntil(server.deletionDate) : '...'}
      <button class="rounded-sm bg-green-300 p-1 px-3">Revive</button>
    </div>
    <div class="flex gap-2 p-4">
      <img class="aspect-square h-full rounded-sm" src={server.icon} alt="Server Icon" />
      <div>
        <h2 class="text-xl font-bold">{server.title}</h2>
        <p class="">{server.gameVersion} {server.serverSoftware} {server.worldType} world</p>
        <p class="">Download Server Files Zip</p>
      </div>
    </div>
  </div>
{/each}

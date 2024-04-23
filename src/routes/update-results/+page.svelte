<script lang="ts">
  import { Result } from 'neverthrow';
  import type { PageData, PageServerData } from './$types';
  import { getFileURL } from '$lib';

  export let data: PageServerData;
  $: updates = data.update;
</script>

{#each updates as serverResult}
  {@const server = serverResult.server}
  {@const resultPromise = serverResult.result}
  <div class="my-2 flex w-full max-w-2xl flex-col rounded-md bg-gray-800">
    <div class="flex gap-4 p-4">
      <img class="pixelated aspect-square h-24 rounded-sm" src={getFileURL(server.collectionId, server.id, server.icon)} alt="Server Icon" />
      <div>
        <h2 class="text-xl font-bold">
          {server.title}
          <span class="px-2 text-sm font-thin text-gray-400">{server.id}</span>
        </h2>
        <p class="">{server.gameVersion} {server.serverSoftware} {server.worldType} world</p>
        <p class="font-bold">
          {#await resultPromise}
            Loading...
          {:then result}
            {#if result.isErr}
              Something went wrong!
              {JSON.stringify(result.error)}
            {:else}
              {#each result.value as update}
                {['ContainerDoesntExist', 'StartedServer', 'StoppedServer', 'KeepState', 'ChangeState', 'ServerTimeToLiveExpired', 'RemoveServer'][update]}
              {/each}
            {/if}
          {/await}
        </p>
      </div>
    </div>
  </div>
{/each}

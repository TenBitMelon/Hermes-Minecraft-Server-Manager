<script lang="ts">
  import { Result } from 'neverthrow';
  import type { PageData, PageServerData } from './$types';
  import { getFileURL, stateDisplay } from '$lib';
  import { ServerUpdateType } from '$lib/types';

  export let data: PageServerData;
  $: updates = data.update;
</script>

{#each updates as serverResult}
  {@const server = serverResult.server}
  {@const resultPromise = serverResult.result}
  {@const display = stateDisplay(server.state)}
  <div class="my-2 flex w-full max-w-2xl flex-col rounded-md bg-gray-800">
    <div class="flex gap-4 p-4">
      <img class="pixelated aspect-square h-24 rounded-sm" src={getFileURL(server.collectionId, server.id, server.icon)} alt="Server Icon" />
      <div>
        <h2 class="text-xl font-bold">
          {server.title}
          <span class="px-2 text-sm font-thin text-gray-400">{server.id}</span>
        </h2>
        <p class="">{server.gameVersion} {server.serverSoftware} {server.worldType} world</p>
        <p class="">
          {#await resultPromise}
            Loading...
          {:then result}
            {#each result as record}
              {#if record.isErr}
                <p>
                  Something went wrong!
                  <br />
                  {record.error.message}
                  <br />
                  <details>
                    <summary> Show Error </summary>
                    <pre>
                      {JSON.stringify(record.error.error, null, 2)}
                    </pre>
                  </details>
                </p>
                <br />
              {:else}
                {#each record.value as update}
                  <p>
                    {ServerUpdateType[update]}
                  </p>
                {/each}
              {/if}
            {/each}
          {/await}
        </p>
        <div class="mt-2 flex items-center gap-2">
          <div class={`h-3 w-3 rounded-full ${display.indicatorColor}`}></div>
          <p class="text-sm font-medium">{display.message}</p>
          <div class="text-sm font-thin text-gray-400">{server.serverFilesMissing ? 'um.. the server files are missing' : ''}</div>
        </div>
      </div>
    </div>
  </div>
{/each}
{#if updates.length === 0}
  <p class="text-center">No servers or no updates run yet</p>
{/if}

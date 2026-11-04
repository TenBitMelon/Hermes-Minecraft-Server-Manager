<script lang="ts">
  import { formatFileSize, getFileURL, timeUntil } from '$lib';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;
  const entries = Object.entries(data.backups);
  entries.forEach(([, value]) => {
    value.sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
  });
  entries.sort(([, a_v], [, b_v]) => Date.parse(b_v[0].created) - Date.parse(a_v[0].created));
</script>

{#if form?.message}
  <div class={`mb-4 rounded-md px-4 py-3 text-sm ${form.success ? 'bg-green-950/40 text-green-200' : 'bg-red-950/40 text-red-200'}`}>
    {form.message}
  </div>
{/if}

<div class="scroll-transparent flex w-full gap-4 overflow-x-auto overflow-y-hidden pb-8">
  {#each entries as [serverID, backups]}
    <div class="my-2 flex w-[90vw] max-w-xl flex-shrink-0 flex-col gap-2 rounded-md">
      <div class="flex w-full items-center pb-4">
        <div class="h-px w-full bg-gray-800" />
        <div class="mx-4 whitespace-nowrap text-sm font-thin">{serverID}</div>
        <div class="h-px w-full bg-gray-800" />
      </div>
      {#each backups as backup}
        <div class=" flex w-full max-w-xl flex-wrap items-center justify-end gap-2 rounded-md bg-gray-900 p-4">
          <!-- <div class="flex w-full flex-wrap items-center justify-between gap-4"> -->
          <p class="mr-auto whitespace-nowrap">
            {timeUntil(backup.created)}
            <span class="text-xs font-light text-gray-400">
              | {new Date(backup.created).toDateString()}
            </span>
          </p>
          <!-- <p class="font-bold">{backup.name}</p> -->
          <!-- </div> -->
          <!-- <div class="flex items-center justify-end gap-4"> -->
          <!-- <span>{backup.file}</span> -->
          <div class="float-right flex items-center gap-4">
            <span class="whitespace-nowrap">{formatFileSize(backup.fileSize)}</span>
            <a href={getFileURL(backup.collectionId, backup.id, backup.file, true)} download={backup.file} class="group flex items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 border-secondary bg-transparent p-1 pl-2 pr-4 text-center text-secondary transition-colors hover:bg-secondary hover:text-black">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" class="fill-secondary transition-colors group-hover:fill-black"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" /></svg>
              {backup.name}
            </a>
            <form method="POST" action="?/deleteBackup">
              <input type="hidden" name="backupId" value={backup.id} />
              <button type="submit" class="group whitespace-nowrap rounded-md border-2 border-red-500 bg-transparent p-1 text-center text-red-400 transition-colors hover:bg-red-500 hover:text-black">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" class="fill-red-400 transition-colors group-hover:fill-black"><path d="M261-120q-24 0-42.5-18.5T200-181v-499h-40v-80h200v-40h240v40h200v80h-40v499q0 24-18.5 42.5T699-120H261Zm418-560H281v499h418v-499ZM360-280h80v-320h-80v320Zm160 0h80v-320h-80v320ZM281-680v499-499Z" /></svg>
              </button>
            </form>
          </div>
          <!-- </div> -->
        </div>
      {/each}
      {#if backups.length == 0}
        <p>No backups available</p>
      {/if}
    </div>
  {/each}
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  let serverStatus: 'Offline' | 'Online' = data.server?.shutdown ? 'Offline' : 'Online';
  let message = '';

  function stopServer() {
    if (data.server)
      fetch(`/api/${data.server.id}/stop`)
        .then((code) => code.json())
        .then((code) => {
          serverStatus = 'Offline';
          message = `Server stopped with code ${code} ${code == 0 ? '✅' : '⚠️'}`;
        });
  }

  function startServer() {
    if (data.server)
      fetch(`/api/${data.server.id}/start`)
        .then((code) => code.json())
        .then((code) => {
          serverStatus = 'Online';
          message = `Server started with code ${code} ${code == 0 ? '✅' : '⚠️'}`;
        });
  }

  function deleteServer() {
    if (data.server)
      fetch(`/api/${data.server.id}/delete`)
        .then((code) => code.json())
        .then((code) => {
          if (code == 0) window.location.href = '/';
          else message = `Server deletion failed with code ${code} ⚠️`;
        });
  }

  function sendCommand(command: string) {
    if (data.server && command)
      fetch(`/api/${data.server.id}/command?command=` + encodeURIComponent(command))
        .then((code) => code.json())
        .then((code) => {
          message = `Command executed with code ${code} ${code == 0 ? '✅' : '⚠️'}`;
          updateLogs();
        });
  }

  function updateLogs() {
    if (data.server && serverStatus == 'Online')
      fetch(`/api/${data.server.id}/logs`)
        .then((logs) => logs.json())
        .then((logs) => {
          data.logs = logs;
        });
  }
</script>

<div class="flex w-full flex-col items-center">
  {#if data.server}
    <div class="flex w-full max-w-xl items-center justify-between">
      <div class="flex flex-col">
        <h1 class="text-lg font-bold">{data.server.title} <span class="text-sm text-gray-400">({data.server.id})</span></h1>
        <span>{data.server.gameVersion} {data.server.serverSoftware} {data.server.worldType} world</span>
      </div>
      <div class="flex">
        <button class="m-2 rounded-md bg-gray-800 p-2" on:click={startServer}>Start</button>
        <button class="m-2 rounded-md bg-gray-800 p-2" on:click={stopServer}>Stop</button>
        <button class="m-2 rounded-md bg-gray-800 p-2" on:click={deleteServer}>Delete</button>
      </div>
      <h2 class="text-lg">{serverStatus}</h2>
    </div>

    <div class="flex items-center gap-2">
      <input type="text" name="command" id="command" placeholder="Enter MC Command Here" />
      <button class="m-2 rounded-md bg-gray-800 p-2" on:click={sendCommand(document.getElementById('command').value)}>Send</button>
    </div>
    <h2 class="text-lg">{message}</h2>

    <div class="flex items-center gap-2">
      <h1>Logs</h1>
      <button class="m-2 rounded-md bg-gray-800 p-2" on:click={updateLogs}>Update</button>
    </div>
    <code class="my-2 w-full overflow-x-scroll whitespace-nowrap rounded-md bg-gray-800 p-4 text-sm">
      {#each data.logs as log}
        <span class="text-cyan-500">
          {log.split('|')[0]} |
        </span>
        <span class="text-gray-400">
          {log.split('|')[1]}
        </span>
        <br />
      {/each}
    </code>
  {:else}
    <p class="text-center">This server doesn't exist</p>
  {/if}
</div>

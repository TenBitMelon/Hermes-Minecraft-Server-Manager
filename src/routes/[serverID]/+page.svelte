<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  let serverStatus: 'Offline' | 'Online' = data.server.shutdown ? 'Offline' : 'Online';
  let message = '';

  function stopServer() {
    fetch(`/api/${data.server.id}/stop`)
      .then((code) => code.json())
      .then((code) => {
        serverStatus = 'Offline';
        message = `Server stopped with code ${code} ${code == 0 ? '✅' : '⚠️'}`;
      });
  }

  function startServer() {
    fetch(`/api/${data.server.id}/start`)
      .then((code) => code.json())
      .then((code) => {
        serverStatus = 'Online';
        message = `Server started with code ${code} ${code == 0 ? '✅' : '⚠️'}`;
      });
  }

  onMount(() => {
    setInterval(() => {
      if (serverStatus == 'Offline') return;
      fetch(`/api/${data.server.id}/logs`)
        .then((logs) => logs.json())
        .then((logs) => {
          data.logs = logs;
        });
    }, 1000);
  });
</script>

<div class="flex w-full flex-col items-center">
  <div class="flex w-full max-w-xl items-center justify-between">
    <h1 class="text-lg font-bold">{data.server.title} <span class="text-gray-400 text-sm">({data.server.id})</span></h1>
    <div class="flex">
      <button class="bg-gray-800 m-2 rounded-md p-2" on:click={startServer}>Start</button>
      <button class="bg-gray-800 m-2 rounded-md p-2" on:click={stopServer}>Stop</button>
    </div>
    <h2 class="text-lg">{serverStatus}</h2>
  </div>
  <h2 class="text-lg">{message}</h2>

  <h1>Logs</h1>
  <code class="bg-gray-800 my-2 w-full overflow-x-scroll whitespace-nowrap rounded-md p-4 text-sm">
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
</div>

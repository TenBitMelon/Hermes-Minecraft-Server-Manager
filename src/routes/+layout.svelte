<script lang="ts">
  import '../app.css';
  import type { LayoutServerData } from './$types';

  export let data: LayoutServerData;
</script>

<div class="flex w-full flex-col items-center gap-4 p-8 max-sm:p-1">
  <div class="flex w-full items-center justify-between gap-4">
    <a href="/" class="flex items-center gap-1">
      <img src="/wing.png" alt="Logo" class="h-10 w-10" />
      <div class="text-3xl font-black">Hermes</div>
    </a>
    <div class="flex items-center gap-2">
      {#await data.allowCreate then allowCreate}
        {#if allowCreate && data.currentUser}
          <a data-sveltekit-preload-data="off" href="/create" class="rounded-md border-2 border-primary bg-transparent p-1 px-4 text-lg font-bold text-primary transition-colors hover:bg-primary hover:text-black">Create</a>
        {/if}
      {/await}
      {#if data.currentUser?.administrator}
        <a href="/backups" class="rounded-md border-2 border-primary bg-transparent p-1 px-4 text-lg font-bold text-primary transition-colors hover:bg-primary hover:text-black">Backups</a>
        <a href="/admin" class="rounded-md border-2 border-secondary bg-transparent p-1 px-4 text-lg font-bold text-secondary transition-colors hover:bg-secondary hover:text-black">Admin</a>
      {/if}
      {#if data.currentUser}
        <div class="flex items-center gap-2 text-sm">
          <div class="flex flex-col">
            <span class="font-semibold">{data.currentUser.name || data.currentUser.username}</span>
          </div>
          <form method="POST" action="/auth/logout">
            <button class="rounded-md border border-gray-600 px-3 py-1 transition-colors hover:bg-gray-800" type="submit">Logout</button>
          </form>
        </div>
      {:else}
        <a href="/auth/login" class="rounded-md border-2 border-secondary bg-transparent p-1 px-4 text-lg font-bold text-secondary transition-colors hover:bg-secondary hover:text-black">Sign In</a>
      {/if}
    </div>
  </div>
  <slot />
  {#if data.currentUser?.administrator}
    <a class="text-sm text-gray-400" href="/update-results">Version: 0.6.0</a>
  {/if}
</div>

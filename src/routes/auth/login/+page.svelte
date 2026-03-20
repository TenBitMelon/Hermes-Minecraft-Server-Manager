<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<div class="grid w-full max-w-md gap-4 rounded-md bg-gray-800 p-6">
  <div>
    <h1 class="text-2xl font-bold">Sign In</h1>
    <p class="text-gray-400">Choose a way to sign in.</p>
  </div>

  {#if data.providers.length === 0}
    <p class="rounded-md border border-rose-700 bg-rose-950/40 p-4 text-sm text-rose-200">No authentication providers are currently available. Check with your administrator.</p>
  {:else}
    <div class="grid gap-3">
      {#each data.providers as provider}
        <a href={`${provider.href}?redirectTo=${encodeURIComponent(data.redirectTo)}`} class="rounded-md border border-secondary px-4 py-3 text-center font-semibold text-secondary transition-colors hover:bg-secondary hover:text-black">{provider.label}</a>
      {/each}
    </div>
  {/if}
</div>

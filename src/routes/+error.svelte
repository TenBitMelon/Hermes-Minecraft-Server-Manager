<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="flex flex-col items-center gap-5 py-20">
  <div class="text-8xl font-bold text-red-400">{$page.status}</div>
  <div class="text-lg text-gray-200">{$page.error?.message || 'The request could not be completed.'}</div>
  <a href="/" class="rounded-md border-2 border-primary bg-transparent p-2 px-4 text-lg font-bold text-primary transition-colors hover:bg-primary hover:text-black">Go back to Home</a>
</div>

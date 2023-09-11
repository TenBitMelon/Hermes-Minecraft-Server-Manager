<script>
  import '../app.css';
</script>

<div class="flex h-full w-full flex-col items-center gap-4 p-8">
  <div class="flex w-full items-center justify-between gap-4">
    <a href="/" class="text-3xl font-black">Hermes</a>
    <a href="/create" class="rounded-md bg-blue-700 p-2 px-4 text-lg font-bold">Create</a>
  </div>
  <slot />
</div>

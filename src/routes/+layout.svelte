<script>
  import '../app.css';
</script>

<div class="flex h-full w-full flex-col items-center gap-4 p-8">
  <div class="flex w-full items-center justify-between gap-4">
    <a href="/" class="flex items-center gap-1">
      <img src="/wing.png" alt="Logo" class="h-10 w-10" />
      <div class="text-3xl font-black">Hermes</div>
    </a>
    <a href="/create" class="rounded-md border-2 border-primary bg-transparent p-2 px-4 text-lg font-bold text-primary transition-colors hover:bg-primary hover:text-black">Create</a>
  </div>
  <slot />
  <a class="text-sm text-gray-400" href="/update-results">Version: 0.5.5</a>
</div>

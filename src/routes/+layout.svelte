<script>
  import '../app.css';
</script>

<div class="flex h-full w-full flex-col items-center gap-4 p-8">
  <div class="flex w-full items-center justify-between gap-4">
    <div class="flex items-center gap-1">
      <img src="/wing.png" alt="Logo" class="h-10 w-10" />
      <a href="/" class="text-3xl font-black">Hermes</a>
    </div>
    <a href="/create" class="rounded-md bg-tertiary p-2 px-4 text-lg font-bold">Create</a>
  </div>
  <slot />
  <p>Version: 0.5.0</p>
</div>

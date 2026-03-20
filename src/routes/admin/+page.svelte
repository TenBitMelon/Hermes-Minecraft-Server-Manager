<script lang="ts">
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;
</script>

<div class="grid w-full max-w-6xl gap-6">
  <section class="rounded-md bg-gray-800 p-4">
    <h1 class="text-2xl font-bold">Administration</h1>
    <p class="text-gray-400">Manage users, quotas, global roles, and server ownership.</p>
    {#if form?.message}
      <p class="mt-2 text-red-400">{form.message}</p>
    {/if}
  </section>

  <section class="rounded-md bg-gray-800 p-4">
    <h2 class="text-xl font-bold">Users</h2>
    <div class="mt-4 grid gap-4">
      {#each data.users as entry}
        <form method="POST" action="?/updateUser" class="grid gap-3 rounded-md border border-gray-700 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
          <input type="hidden" name="userId" value={entry.user.id} />
          <div>
            <div class="font-semibold">{entry.user.name || entry.user.username}</div>
            <div class="text-sm text-gray-400">{entry.user.email}</div>
            <div class="text-xs text-gray-500">{entry.user.id}</div>
          </div>
          <label class="grid gap-1 text-sm">
            <span>Administrator</span>
            <select class="rounded-md bg-gray-900 p-2" name="administrator">
              <option value="false" selected={!entry.user.administrator}>No</option>
              <option value="true" selected={entry.user.administrator}>Yes</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm">
            <span>Owned Server Limit</span>
            <input class="rounded-md bg-gray-900 p-2" type="number" min="0" name="ownedServerLimit" value={entry.user.ownedServerLimit ?? 1} />
          </label>
          <button class="rounded-md bg-secondary px-4 py-2 font-semibold text-black transition-colors hover:brightness-110" type="submit">Save</button>
        </form>
      {/each}
    </div>
  </section>

  <section class="rounded-md bg-gray-800 p-4">
    <h2 class="text-xl font-bold">Servers</h2>
    <div class="mt-4 grid gap-4">
      {#each data.servers as server}
        <form method="POST" action="?/transferOwner" class="grid gap-3 rounded-md border border-gray-700 p-4 md:grid-cols-[2fr_2fr_auto] md:items-end">
          <input type="hidden" name="serverId" value={server.id} />
          <div>
            <div class="font-semibold">{server.title}</div>
            <div class="text-sm text-gray-400">{server.id}</div>
          </div>
          <label class="grid gap-1 text-sm">
            <span>Owner</span>
            <select class="rounded-md bg-gray-900 p-2" name="ownerUserId">
              {#each data.users as entry}
                <option value={entry.user.id} selected={server.owner === entry.user.id}>{entry.user.name || entry.user.username} ({entry.user.email})</option>
              {/each}
            </select>
          </label>
          <div class="flex gap-2">
            <button class="rounded-md bg-secondary px-4 py-2 font-semibold text-black transition-colors hover:brightness-110" type="submit">Transfer</button>
            <a class="rounded-md bg-gray-700 px-4 py-2 font-semibold transition-colors hover:bg-gray-600" href={`/${server.id}/access`}>Access</a>
          </div>
        </form>
      {/each}
    </div>
  </section>
</div>

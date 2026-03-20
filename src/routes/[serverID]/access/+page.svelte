<script lang="ts">
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  const capabilityFields = [
    ['canStartStop', 'Start/stop server'],
    ['canSendConsole', 'Send console commands'],
    ['canManageFiles', 'Manage files'],
    ['canManageAccess', 'Manage access'],
    ['canManageConfig', 'Manage server config']
  ] as const;
</script>

<div class="grid w-full max-w-5xl gap-6">
  <section class="rounded-md bg-gray-800 p-4">
    <h1 class="text-2xl font-bold">Server Access</h1>
    <p class="text-gray-400">{data.server.title} ({data.server.id})</p>
    {#if form?.message}
      <p class="mt-2 text-red-400">{form.message}</p>
    {/if}
  </section>

  <section class="rounded-md bg-gray-800 p-4">
    <h2 class="text-xl font-bold">Grant Access</h2>
    <form method="POST" action="?/save" class="mt-4 grid gap-4">
      <label class="grid gap-1 text-sm">
        <span>User</span>
        <select class="rounded-md bg-gray-900 p-2" name="userId">
          {#each data.users as entry}
            <option value={entry.user.id}>{entry.user.name || entry.user.username} ({entry.user.email})</option>
          {/each}
        </select>
      </label>
      <div class="grid gap-2 md:grid-cols-2">
        {#each capabilityFields as [field, label]}
          <label class="flex items-center gap-2 rounded-md border border-gray-700 p-3">
            <input type="checkbox" name={field} />
            <span>{label}</span>
          </label>
        {/each}
      </div>
      <button class="w-fit rounded-md bg-secondary px-4 py-2 font-semibold text-black transition-colors hover:brightness-110" type="submit">Save Access</button>
    </form>
  </section>

  <section class="rounded-md bg-gray-800 p-4">
    <h2 class="text-xl font-bold">Existing Access</h2>
    <div class="mt-4 grid gap-4">
      {#if data.memberships.length === 0}
        <p class="text-gray-400">No delegated access yet.</p>
      {/if}
      {#each data.memberships as entry}
        <div class="rounded-md border border-gray-700 p-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="font-semibold">{entry.user?.name || entry.user?.username || entry.membership.user}</div>
              <div class="text-sm text-gray-400">{entry.user?.email || entry.membership.user}</div>
            </div>
            <form method="POST" action="?/delete">
              <input type="hidden" name="membershipId" value={entry.membership.id} />
              <button class="rounded-md bg-red-700 px-4 py-2 font-semibold transition-colors hover:bg-red-600" type="submit">Remove</button>
            </form>
          </div>
          <form method="POST" action="?/save" class="mt-4 grid gap-3">
            <input type="hidden" name="userId" value={entry.membership.user} />
            <div class="grid gap-2 md:grid-cols-2">
              {#each capabilityFields as [field, label]}
                <label class="flex items-center gap-2 rounded-md border border-gray-700 p-3">
                  <input type="checkbox" name={field} checked={entry.membership[field]} />
                  <span>{label}</span>
                </label>
              {/each}
            </div>
            <button class="w-fit rounded-md bg-secondary px-4 py-2 font-semibold text-black transition-colors hover:brightness-110" type="submit">Update Access</button>
          </form>
        </div>
      {/each}
    </div>
  </section>
</div>

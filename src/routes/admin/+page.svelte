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
      <p class={`mt-2 ${form.success ? 'text-green-400' : 'text-red-400'}`}>{form.message}</p>
    {/if}
  </section>

  <section class="rounded-md bg-gray-800 p-4">
    <h2 class="text-xl font-bold">Workers</h2>
    <p class="text-gray-400">Register container hosts, tune their capacity, and manage routing targets.</p>
    <div class="mt-4 grid gap-4">
      {#each data.workers as worker}
        <div class="grid gap-3 rounded-md border border-gray-700 p-4">
          <form method="POST" action="?/saveWorker" class="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="workerId" value={worker.id} />
            <label class="grid gap-1 text-sm">
              <span>Name</span>
              <input class="rounded-md bg-gray-900 p-2" name="name" value={worker.name} />
            </label>
            <label class="grid gap-1 text-sm">
              <span>Base URL</span>
              <input class="rounded-md bg-gray-900 p-2" name="baseUrl" value={worker.baseUrl} />
            </label>
            <label class="grid gap-1 text-sm">
              <span>Public Address</span>
              <input class="rounded-md bg-gray-900 p-2" name="publicAddress" value={worker.publicAddress} />
            </label>
            <label class="grid gap-1 text-sm">
              <span>Status</span>
              <select class="rounded-md bg-gray-900 p-2" name="status">
                <option value="online" selected={worker.status === 'online'}>online</option>
                <option value="restarting" selected={worker.status === 'restarting'}>restarting</option>
                <option value="offline" selected={worker.status === 'offline'}>offline</option>
                <option value="disabled" selected={worker.status === 'disabled'}>disabled</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm">
              <span>Port Range</span>
              <div class="grid grid-cols-2 gap-2">
                <input class="rounded-md bg-gray-900 p-2" type="number" name="portMin" value={worker.portMin} />
                <input class="rounded-md bg-gray-900 p-2" type="number" name="portMax" value={worker.portMax} />
              </div>
            </label>
            <label class="grid gap-1 text-sm">
              <span>Server Capacity</span>
              <input class="rounded-md bg-gray-900 p-2" type="number" min="1" name="serverCapacity" value={worker.serverCapacity} />
            </label>
            <label class="grid gap-1 text-sm">
              <span>API Token</span>
              <input class="rounded-md bg-gray-900 p-2" name="apiToken" placeholder="Leave blank to keep current token" />
            </label>
            <label class="grid gap-1 text-sm">
              <span>Avoid 25565</span>
              <select class="rounded-md bg-gray-900 p-2" name="avoidDefaultPort">
                <option value="false" selected={!worker.avoidDefaultPort}>No</option>
                <option value="true" selected={worker.avoidDefaultPort}>Yes</option>
              </select>
            </label>
            <div class="text-sm text-gray-400">
              <div>{worker.runningServerCount} running / {worker.totalServerCount} total</div>
              <div>Last heartbeat: {worker.lastHeartbeatAt || 'never'}</div>
              <div>{worker.lastHeartbeatError}</div>
            </div>
            <div class="flex flex-wrap gap-2 md:col-span-3">
              <button class="rounded-md bg-secondary px-4 py-2 font-semibold text-black transition-colors hover:brightness-110" type="submit">Save Worker</button>
            </div>
          </form>
          <form method="POST" action="?/deleteWorker" on:submit={(event) => !confirm(`Delete worker ${worker.name}?`) && event.preventDefault()}>
            <input type="hidden" name="workerId" value={worker.id} />
            <button class="rounded-md bg-red-700 px-4 py-2 font-semibold transition-colors hover:bg-red-600" type="submit">Delete Worker</button>
          </form>
        </div>
      {/each}

      <form method="POST" action="?/saveWorker" class="grid gap-3 rounded-md border border-dashed border-gray-700 p-4 md:grid-cols-3">
        <label class="grid gap-1 text-sm">
          <span>Name</span>
          <input class="rounded-md bg-gray-900 p-2" name="name" placeholder="Worker name" />
        </label>
        <label class="grid gap-1 text-sm">
          <span>Base URL</span>
          <input class="rounded-md bg-gray-900 p-2" name="baseUrl" placeholder="https://worker.example.com" />
        </label>
        <label class="grid gap-1 text-sm">
          <span>Public Address</span>
          <input class="rounded-md bg-gray-900 p-2" name="publicAddress" placeholder="mc-node-1.example.com" />
        </label>
        <label class="grid gap-1 text-sm">
          <span>Port Min</span>
          <input class="rounded-md bg-gray-900 p-2" type="number" name="portMin" />
        </label>
        <label class="grid gap-1 text-sm">
          <span>Port Max</span>
          <input class="rounded-md bg-gray-900 p-2" type="number" name="portMax" />
        </label>
        <label class="grid gap-1 text-sm">
          <span>Capacity</span>
          <input class="rounded-md bg-gray-900 p-2" type="number" name="serverCapacity" value="25" />
        </label>
        <label class="grid gap-1 text-sm">
          <span>Status</span>
          <select class="rounded-md bg-gray-900 p-2" name="status">
            <option value="online">online</option>
            <option value="disabled">disabled</option>
          </select>
        </label>
        <label class="grid gap-1 text-sm">
          <span>Avoid 25565</span>
          <select class="rounded-md bg-gray-900 p-2" name="avoidDefaultPort">
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <label class="grid gap-1 text-sm">
          <span>API Token</span>
          <input class="rounded-md bg-gray-900 p-2" name="apiToken" />
        </label>
        <div class="md:col-span-3">
          <button class="rounded-md bg-secondary px-4 py-2 font-semibold text-black transition-colors hover:brightness-110" type="submit">Add Worker</button>
        </div>
      </form>
    </div>
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
        <div class="grid gap-3 rounded-md border border-gray-700 p-4 md:grid-cols-[2fr_2fr_auto] md:items-end">
          <form method="POST" action="?/transferOwner" class="contents">
            <input type="hidden" name="serverId" value={server.id} />
            <div>
              <div class="font-semibold">{server.title}</div>
              <div class="text-sm text-gray-400">{server.id}</div>
              <div class="text-xs text-gray-500">Worker: {server.worker || 'local runtime'} / Port: {server.port}</div>
            </div>
            <label class="grid gap-1 text-sm">
              <span>Owner</span>
              <select class="rounded-md bg-gray-900 p-2" name="ownerUserId">
                {#each data.users as entry}
                  <option value={entry.user.id} selected={server.owner === entry.user.id}>{entry.user.name || entry.user.username} ({entry.user.email})</option>
                {/each}
              </select>
            </label>
            <div class="flex flex-wrap gap-2">
              <button class="rounded-md bg-secondary px-4 py-2 font-semibold text-black transition-colors hover:brightness-110" type="submit">Transfer</button>
              <a class="rounded-md bg-gray-700 px-4 py-2 font-semibold transition-colors hover:bg-gray-600" href={`/${server.id}/access`}>Access</a>
            </div>
          </form>
          <div class="md:col-span-2"></div>
          <form
            method="POST"
            action="?/deleteServer"
            on:submit={(event) => {
              if (!confirm(`Delete ${server.title}? This permanently removes the server, files, DNS records, and backups.`)) {
                event.preventDefault();
              }
            }}
            class="md:col-start-3">
            <input type="hidden" name="serverId" value={server.id} />
            <button class="w-full rounded-md bg-red-700 px-4 py-2 font-semibold transition-colors hover:bg-red-600" type="submit">Delete Server</button>
          </form>
        </div>
      {/each}
    </div>
  </section>
</div>

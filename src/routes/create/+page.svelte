<script lang="ts">
  import { enhance } from '$app/forms';
  import { PUBLIC_DEFAULT_ICON_URL } from '$env/static/public';
  import { ServerSoftware, ServerSoftwareOptions, TimeToLive, WorldType } from '$lib/database/types';
  import { string, type SafeParseError, type typeToFlattenedError } from 'zod';
  import type { ActionData } from './$types';
  import type { ServerCreationSchema } from '$lib/servers/schema';

  type ExtractErrorType<T> = T extends SafeParseError<infer V> ? V : never;
  type ErrorsObject = typeToFlattenedError<ExtractErrorType<ReturnType<typeof ServerCreationSchema.safeParse>>>['fieldErrors'];

  export let form: ActionData;
  let errors: ErrorsObject = {};
  $: errors = form == null || form.success == true ? {} : form.fields;

  let selectedSoftware: ServerSoftware = ServerSoftware.Vanilla;
  let selectedGameVersion: string;
  $: if (!ServerSoftwareOptions[selectedSoftware]?.versions.flat().includes(selectedGameVersion)) selectedGameVersion = ServerSoftwareOptions[selectedSoftware]?.versions.at(-1)?.at(-1) ?? '';

  let worldCreator: 'new' | 'source' = 'new';
  let worldType: WorldType = WorldType.Normal;
  let superflatLayers: { block: string; height: number }[] = [{ block: 'grass', height: 1 }];

  let iconImageElement: HTMLImageElement;
  let iconFileElement: HTMLInputElement;

  let createButtonLoading = false;

  function handleIconChange() {
    if (iconFileElement?.files?.length) {
      const file = iconFileElement.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        iconImageElement.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
</script>

<!-- {JSON.stringify(form)} -->

{#if form?.success == false}
  {form.message}
{/if}

<form
  method="post"
  class="flex flex-col items-center gap-4"
  enctype="multipart/form-data"
  use:enhance={() => {
    createButtonLoading = true;
    return ({ update }) => {
      createButtonLoading = false;
      update();
    };
  }}>
  <div class="flex flex-col gap-4">
    <div class="flex gap-4">
      <label class={`w-full ${errors.title ? 'error-outline' : ''}`}>
        <input type="text" name="title" id="title" placeholder="Server Title" />
      </label>
      <label class={`${errors.subdomain ? 'error-outline' : ''}`}>
        <input type="text" name="subdomain" placeholder="Subdomain" />
      </label>
    </div>
    <label class={`flex w-full items-center gap-2 ${errors.icon ? 'error-outline' : ''}`}>
      <img class="h-10 w-10" alt="" bind:this={iconImageElement} src={PUBLIC_DEFAULT_ICON_URL} />
      Server Icon
      <input type="file" name="icon" placeholder="Server Icon" accept="image/*" bind:this={iconFileElement} on:change={handleIconChange} />
    </label>
    <label class={`${errors.motd ? 'error-outline' : ''}`}>
      <textarea name="motd" class="w-full" placeholder="A Hermes Minecraft Server" />
      <a href="https://minecraft.tools/motd.php" target="_blank" rel="noopener noreferrer" class="underline">Formatting Codes</a>
    </label>
  </div>
  <div class="flex w-full justify-center gap-4">
    {#each Object.keys(ServerSoftwareOptions) as software}
      <label class={`flex cursor-pointer items-center gap-2 capitalize  ${errors.serverSoftware ? 'error-outline' : ''}`}>
        <input type="radio" name="serverSoftware" value={software} bind:group={selectedSoftware} />
        {software}
      </label>
    {/each}
  </div>
  <div class="flex justify-around gap-1">
    {#each ServerSoftwareOptions[selectedSoftware]?.versions ?? [] as version}
      <div class="group flex w-full flex-col gap-1">
        {#each version as versionNumber}
          <label class={`flex cursor-pointer items-center gap-2  checked:block group-hover:flex ${(version[0] == versionNumber && !version.includes(selectedGameVersion)) || selectedGameVersion == versionNumber ? 'block' : 'hidden'} ${errors.gameVersion ? 'error-outline' : ''}`}>
            <input type="radio" name="gameVersion" value={versionNumber} bind:group={selectedGameVersion} />
            {versionNumber}
          </label>
        {/each}
      </div>
    {/each}
  </div>
  <div class="flex justify-center gap-4">
    {#if ServerSoftwareOptions[selectedSoftware]?.newWorld}
      <label class="flex cursor-pointer items-center gap-2">
        <input type="radio" name="worldCreator" value="new" bind:group={worldCreator} />
        New World
      </label>
    {/if}
    {#if ServerSoftwareOptions[selectedSoftware]?.fromSource}
      <label class="flex cursor-pointer items-center gap-2">
        <input type="radio" name="worldCreator" value="source" bind:group={worldCreator} />
        From Source
      </label>
    {/if}
  </div>
  {#if ServerSoftwareOptions[selectedSoftware]?.newWorld || ServerSoftwareOptions[selectedSoftware]?.fromSource}
    <div class="w-fit bg-gray-900 p-4">
      {#if worldCreator == 'new' && ServerSoftwareOptions[selectedSoftware]?.newWorld}
        <div class="flex flex-col items-stretch gap-1">
          <label class={`${errors.worldSeed ? 'error-outline' : ''}`}>
            <input type="text" class="w-full" name="worldSeed" placeholder="World Seed" />
          </label>
          <div class="flex gap-1">
            {#each Object.values(WorldType) as type}
              <label class="flex cursor-pointer items-center gap-2">
                <input type="radio" name="worldType" value={type} bind:group={worldType} />
                {type}
              </label>
            {/each}
          </div>
          {#if worldType == 'flat'}
            <div>
              <input type="text" name="superflatLayers" bind:value={superflatLayers} hidden />
              <!-- Superflat creator -->
              <div class={`flex flex-col gap-1 ${errors.superflatLayers ? 'error-outline' : ''}`}>
                {#each superflatLayers as layer}
                  <div class="flex gap-1">
                    <label>
                      <input type="text" placeholder="Block" class="w-full" bind:value={layer.block} />
                    </label>
                    <label>
                      <input type="number" placeholder="Height" bind:value={layer.height} />
                    </label>
                  </div>
                {/each}
                <button
                  type="button"
                  class="rounded-md bg-gray-800 p-2 px-4"
                  on:click={() => {
                    superflatLayers = [...superflatLayers, { block: 'grass', height: 1 }];
                  }}>Add Layer</button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
      {#if worldCreator == 'source' && ServerSoftwareOptions[selectedSoftware]?.fromSource}
        <div class="flex flex-col gap-1">
          <label class={`${errors.worldSourceURL ? 'error-outline' : ''}`}>
            <input type="url" class="w-96" name="worldSourceURL" placeholder="World Source Download URL" />
          </label>
          <!-- <label class={`${errors.worldSource ? 'error-outline' : ''}`}>
            <input type="file" name="worldSource" placeholder="World Source" />
          </label> -->
        </div>
      {/if}
    </div>
  {/if}

  <div class="flex gap-4">
    {#if ServerSoftwareOptions[selectedSoftware]?.modsUpload}
      <div class="flex flex-col gap-1">
        <span class="text-sm">Mods</span>
        <label class={`${errors.mods ? 'error-outline' : ''}`}>
          <input type="file" name="mods" id="mods" placeholder="Mods" multiple />
        </label>
      </div>
    {/if}
    {#if ServerSoftwareOptions[selectedSoftware]?.pluginsUpload}
      <div class="flex flex-col gap-1">
        <span class="text-sm">Plugins</span>
        <label class={`${errors.plugins ? 'error-outline' : ''}`}>
          <input type="file" name="plugins" placeholder="Plugins" multiple />
        </label>
      </div>
    {/if}
    <!-- Resourcepack -->
    <div class="flex flex-col gap-1">
      <span class="text-sm">Resourcepack URL</span>
      <!-- <label class={`${errors.resourcepack ? 'error-outline' : ''}`}>
        <input type="file" name="resourcepack" placeholder="Resourcepack" />
      </label> -->
      <label class={`${errors.resourcepackURL ? 'error-outline' : ''}`}>
        <input class="w-80" type="url" name="resourcepackURL" placeholder="Resourcepack URL" />
      </label>
    </div>
    <div class="flex flex-col gap-1">
      <span class="text-sm">Datapack URL</span>
      <!-- <label class={`${errors.resourcepack ? 'error-outline' : ''}`}>
        <input type="file" name="resourcepack" placeholder="Resourcepack" />
      </label> -->
      <label class={`${errors.datapackURL ? 'error-outline' : ''}`}>
        <input class="w-80" type="url" name="datapackURL" placeholder="Datapack URL" />
      </label>
    </div>
  </div>

  <div class="grid grid-cols-3 gap-4">
    <label class={`${errors.maxPlayers ? 'error-outline' : ''}`}>
      <input type="number" name="maxPlayers" placeholder="Max Players" value="10" />
      Max Players
    </label>
    <label class={`${errors.difficulty ? 'error-outline' : ''}`}>
      <select name="difficulty">
        <option value="peaceful">Peaceful</option>
        <option value="easy">Easy</option>
        <option value="normal" selected>Normal</option>
        <option value="hard">Hard</option>
      </select>
      Difficulty
    </label>
    <label class={`${errors.gamemode ? 'error-outline' : ''}`}>
      <select name="gamemode">
        <option value="survival" selected>Survival</option>
        <option value="creative">Creative</option>
        <option value="adventure">Adventure</option>
        <option value="spectator">Spectator</option>
      </select>
      Gamemode
    </label>
    <label class={`${errors.allowNether ? 'error-outline' : ''} flex cursor-pointer items-center gap-2 `}>
      <input type="checkbox" name="allowNether" checked />
      Allow Nether
    </label>
    <label class={`${errors.viewDistance ? 'error-outline' : ''}`}>
      <input type="number" value="16" name="viewDistance" placeholder="View Distance" />
      View Distance
    </label>
    <label class={`${errors.simulationDistance ? 'error-outline' : ''}`}>
      <input type="number" value="10" name="simulationDistance" placeholder="Simulation Distance" />
      Simulation Distance
    </label>
    <label class={`${errors.hardcore ? 'error-outline' : ''} flex cursor-pointer items-center gap-2 `}>
      <input type="checkbox" value="true" name="hardcore" />
      Hardcore
    </label>
    <label class={`${errors.enableCommandBlock ? 'error-outline' : ''} flex cursor-pointer items-center gap-2 `}>
      <input type="checkbox" value="true" checked name="enableCommandBlock" />
      Enable Command Block
    </label>
    <label class={`${errors.enablePVP ? 'error-outline' : ''} flex cursor-pointer items-center gap-2 `}>
      <input type="checkbox" value="true" checked name="enablePVP" />
      PvP
    </label>
    <label class={`min-h-[16rem] ${errors.whitelist ? 'error-outline' : ''}`}>
      Whitelist
      <textarea class="h-full w-full" name="whitelist" placeholder={`[\n\t{\n\t\tuuid: "0000-0000-0000-0000",\n\t\tname: "username"\n\t}\n]`} />
    </label>
    <label class={`min-h-[16rem] ${errors.ops ? 'error-outline' : ''}`}>
      Ops
      <textarea class="h-full w-full" name="ops" placeholder={`[\n\t{\n\t\tuuid: "0000-0000-0000-0000"\n\t\tname: "username"\n\t\tlevel: 4,\n\t\tbypassesPlayerLimit: true\n\t}\n]`} />
    </label>
    <label class={`min-h-[16rem] ${errors.bannedPlayers ? 'error-outline' : ''}`}>
      Banned Players
      <textarea class="h-full w-full whitespace-pre" name="bannedPlayers" placeholder={`[\n\t{\n\t\tuuid: "0000-0000-0000-0000",\n\t\tname: "username",\n\t\tcreated: "1970-01-01T00:00:00.000Z",\n\t\tsource: "username",\n\t\texpires: "1970-01-01T00:00:00.000Z",\n\t\treason: "Ban Hammer"\n\t}\n]`} />
    </label>
    <div class="col-span-3 flex flex-col">
      <div class="text-lg font-bold">Server Properties</div>
      <div>This file will override all set properties above <br /> (only enable if you know what you are doing)</div>
      <label class={`${errors.serverProperties ? 'error-outline' : ''}`}>
        <input type="file" name="serverProperties" placeholder="Server Properties" />
      </label>
    </div>
  </div>
  <div class="grid grid-cols-3 gap-4">
    <!-- <label class={`${errors.timeToLive ? 'error-outline' : ''}`}>
      <select name="timeToLive">
        {#each Object.values(TimeToLive) as timeToLive}
          <option value={timeToLive}>{timeToLive}</option>
        {/each}
      </select>
    </label> -->
    <label class={`flex cursor-pointer items-center gap-2 ${errors.eula ? 'error-outline' : ''}`}>
      <input type="checkbox" name="eula" value="true" />
      I agree to the <a href="https://www.minecraft.net/en-us/eula" target="_blank" rel="noopener noreferrer" class="underline">Minecraft EULA</a>
    </label>
    <button type="submit" disabled={createButtonLoading} class="flex items-center justify-center rounded-md border-2 border-primary bg-transparent p-2 px-4 text-lg font-bold text-primary transition-colors hover:bg-primary hover:text-black disabled:cursor-not-allowed disabled:opacity-75 disabled:hover:bg-transparent disabled:hover:text-primary">
      {#if createButtonLoading}
        <svg class="-ml-1 mr-3 h-5 w-5 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      {/if}
      Create
    </button>
  </div>
</form>

<style>
  .error-outline {
    position: relative;
  }

  .error-outline::before {
    content: '';
    display: block;
    position: absolute;
    border: 0.2rem solid red;
    inset: -0.3rem;
    border-radius: 1rem;
    filter: url(#combined-hover);
  }

  input,
  textarea,
  select {
    background: transparent;
  }

  input[type='checkbox'],
  input[type='radio'] {
    @apply accent-secondary;
  }

  label {
    @apply rounded-md bg-gray-800 p-2 px-4;
  }
</style>

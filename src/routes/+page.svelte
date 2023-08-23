<script lang="ts">
	export let data: any;
	let account = 'hello';

	// data.account = ['this aray'];
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<p>{account}</p>
<button on:click={() => (account = 'sdfkjsdfkhsdkjf')}>Click me</button>
<div>
	{#each data.accounts as item}
		<p>{item}</p>
	{/each}
	{#if data.accounts.length === 0}
		<p>No accounts</p>
	{/if}
</div>

<form>
	<input type="text" name="name" placeholder="Name" />
	<button>Button</button>
</form>

import type { Actions, PageServerLoadEvent } from './$types';

export async function load({ url, params }: PageServerLoadEvent) {
	return {
		accounts: ['hello', 'goodbye']
	};
}

export const actions: Actions = {
	default: async ({ params }) => {
		return {};
	}
};

import type { TypedPocketBase, UserResponse } from '$lib/database/types';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      pb: TypedPocketBase;
      user: UserResponse | null;
    }
    interface PageData {
      currentUser?: {
        id: string;
        email: string;
        name: string;
        username: string;
        avatar: string;
        administrator: boolean;
        ownedServerLimit: number;
      } | null;
      availableAuthProviders?: {
        id: string;
        label: string;
        href: string;
      }[];
    }
    // interface Platform {}
  }
}

export {};

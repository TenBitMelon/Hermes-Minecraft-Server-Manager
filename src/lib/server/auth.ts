import { env as publicEnv } from '$env/dynamic/public';
import { error, redirect } from '@sveltejs/kit';
import { serverPB } from '$lib/database';
import { Collections, type ServerMembershipResponse, type ServerResponse, type UserResponse } from '$lib/database/types';
import { selectWorkerForNewServer } from '$lib/workers/placement';

export type ServerCapability = 'canViewDashboard' | 'canStartStop' | 'canSendConsole' | 'canManageFiles' | 'canManageAccess' | 'canManageConfig';

export type EffectiveServerAccess = {
  isAdmin: boolean;
  isOwner: boolean;
  canViewDashboard: boolean;
  canStartStop: boolean;
  canSendConsole: boolean;
  canManageFiles: boolean;
  canManageAccess: boolean;
  canManageConfig: boolean;
};

export type AppViewer = {
  user: UserResponse | null;
};

const defaultOwnedServerLimit = 0;

export function isAdmin(user: UserResponse | null | undefined) {
  return Boolean(user?.administrator);
}

export async function ensureUserDefaults(user: UserResponse) {
  const updates: Partial<UserResponse> = {};
  if (!user.name) updates.name = user.username;
  if (user.ownedServerLimit == null) updates.ownedServerLimit = defaultOwnedServerLimit;
  if (user.administrator) updates.ownedServerLimit = 100;

  if (Object.keys(updates).length === 0) return user;

  return serverPB.collection(Collections.Users).update<UserResponse>(user.id, {
    ...updates
  });
}

export async function getOwnedServerCount(userId: string) {
  return serverPB.collection(Collections.Servers).getList(1, 1, {
    filter: serverPB.filter('owner = {:userId}', { userId })
  });
}

export async function canCreateServers(user: UserResponse | null) {
  if (!user) return false;

  const [ownedServerPage, workerResult] = await Promise.all([getOwnedServerCount(user.id), selectWorkerForNewServer()]);
  return ownedServerPage.totalItems < user.ownedServerLimit && workerResult.isOk();
}

type AuthProviderId = 'github' | 'google' | 'authentik';

const authProviderLabels: Record<AuthProviderId, string> = {
  github: 'Continue with GitHub',
  google: 'Continue with Google',
  authentik: 'Continue with Authentik'
};

export function getAllowedAuthProviders() {
  const configured = (publicEnv.PUBLIC_AUTH_PROVIDERS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const unique = [...new Set(configured)];
  return unique.filter((provider): provider is AuthProviderId => provider in authProviderLabels);
}

function providerMatchesAllowed(providerName: string, allowedProvider: AuthProviderId) {
  if (allowedProvider === 'authentik') return providerName === 'oidc' || providerName === 'oidc2' || providerName === 'oidc3';
  return providerName === allowedProvider;
}

export async function getAvailableAuthProviders(pb: App.Locals['pb']) {
  const allowedProviders = getAllowedAuthProviders();
  if (allowedProviders.length === 0) return [];

  const authMethods = await pb.collection(Collections.Users).listAuthMethods();

  return allowedProviders
    .filter((allowedProvider) => authMethods.authProviders.some((provider) => providerMatchesAllowed(provider.name, allowedProvider)))
    .map((provider) => ({
      id: provider,
      label: authProviderLabels[provider],
      href: `/auth/login/${provider}`
    }));
}

export async function getAuthProviderConfig(pb: App.Locals['pb'], provider: string) {
  const allowedProviders = getAllowedAuthProviders();
  if (!allowedProviders.includes(provider as AuthProviderId)) error(404, 'That sign-in provider is not available.');

  const authMethods = await pb.collection(Collections.Users).listAuthMethods();
  const pbProvider = authMethods.authProviders.find((candidate) => providerMatchesAllowed(candidate.name, provider as AuthProviderId));
  if (!pbProvider) error(503, `${provider} login has not been configured in PocketBase yet.`);

  return {
    appProvider: provider as AuthProviderId,
    pbProvider
  };
}

export async function getVisibleServersForUser(_viewer: AppViewer) {
  return serverPB.collection(Collections.Servers).getFullList<ServerResponse>();
}

export async function getServerWithAccess(serverId: string, viewer: AppViewer) {
  const server = await serverPB
    .collection(Collections.Servers)
    .getOne<ServerResponse>(serverId)
    .catch(() => null);
  if (!server) error(404, "This server doesn't exist");

  const admin = isAdmin(viewer.user);
  const owner = Boolean(viewer.user && server.owner === viewer.user.id);

  let membership: ServerMembershipResponse | null = null;
  if (viewer.user && !admin && !owner) {
    membership = await serverPB
      .collection(Collections.ServerMemberships)
      .getFirstListItem<ServerMembershipResponse>(serverPB.filter('server = {:serverId} && user = {:userId}', { serverId, userId: viewer.user.id }))
      .catch(() => null);
  }

  const access: EffectiveServerAccess = {
    isAdmin: admin,
    isOwner: owner,
    canViewDashboard: admin || owner || Boolean(membership),
    canStartStop: admin || owner || Boolean(membership?.canStartStop),
    canSendConsole: admin || owner || Boolean(membership?.canSendConsole),
    canManageFiles: admin || owner || Boolean(membership?.canManageFiles),
    canManageAccess: admin || owner || Boolean(membership?.canManageAccess),
    canManageConfig: admin || owner || Boolean(membership?.canManageConfig)
  };

  return { server, access, membership };
}

export async function requireServerCapability(serverId: string, viewer: AppViewer, capability: ServerCapability) {
  if (!viewer.user) error(401, 'You must be signed in to do that.');

  const result = await getServerWithAccess(serverId, viewer);
  if (!result.access[capability]) error(403, 'You do not have permission to do that.');
  return result;
}

export function requireLogin(viewer: AppViewer) {
  if (!viewer.user) error(401, 'You must be signed in to do that.');
  return { user: viewer.user };
}

export function requireAdministrator(viewer: AppViewer) {
  requireLogin(viewer);
  if (!isAdmin(viewer.user)) error(403, 'Administrator access is required.');
  return { user: viewer.user! };
}

export async function getUserDirectory() {
  const users = await serverPB.collection(Collections.Users).getFullList<UserResponse>();
  return users.map((user) => ({
    user
  }));
}

export async function getServerMemberships(serverId: string) {
  const [memberships, users] = await Promise.all([
    serverPB.collection(Collections.ServerMemberships).getFullList<ServerMembershipResponse>({
      filter: serverPB.filter('server = {:serverId}', { serverId })
    }),
    getUserDirectory()
  ]);

  const userMap = new Map(users.map((entry) => [entry.user.id, entry]));
  return memberships.map((membership) => ({
    membership,
    user: userMap.get(membership.user)?.user ?? null
  }));
}

export function getPostLoginRedirect(url: URL) {
  return url.searchParams.get('redirectTo') || '/';
}

export function redirectToLogin(url: URL) {
  throw redirect(303, `/auth/login?redirectTo=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
}

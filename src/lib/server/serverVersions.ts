import { ServerSoftware } from '$lib/database/types';

type MinecraftManifestVersion = {
  id: string;
  type: 'release' | 'snapshot' | string;
  releaseTime: string;
};

type MinecraftVersionManifest = {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MinecraftManifestVersion[];
};

type FabricGameVersion = {
  version?: string;
  stable?: boolean;
};

type PaperProjectVersionsResponse = {
  versions?: Record<string, string[]>;
};

export type ServerVersionOption = {
  id: string;
  type: 'release' | 'snapshot';
  supported: boolean;
};

export type ServerVersionCatalog = Record<ServerSoftware, ServerVersionOption[]>;

const USER_AGENT = 'HermesMinecraftServerManager/0.7.0 (https://github.com/melonboy10/Hermes-Minecraft-Server-Manager)';
const CACHE_TTL_MS = 1000 * 60 * 30;

let cachedCatalog: { expiresAt: number; value: ServerVersionCatalog } | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function isReleaseVersion(version: string) {
  return /^\d+\.\d+(\.\d+)?$/.test(version);
}

function asVersionOptions(manifestVersions: MinecraftManifestVersion[], supportedVersions: Set<string>, allowSnapshots: boolean) {
  return manifestVersions
    .filter((version) => allowSnapshots || version.type === 'release')
    .map<ServerVersionOption>((version) => ({
      id: version.id,
      type: version.type === 'snapshot' ? 'snapshot' : 'release',
      supported: supportedVersions.has(version.id)
    }))
    .filter((version) => version.supported);
}

async function fetchPaperSupportedVersions() {
  const paperData = await fetchJson<PaperProjectVersionsResponse>('https://fill.papermc.io/v3/projects/paper');
  const versions = Object.values(paperData.versions ?? {}).flat();
  return new Set(versions.filter(isReleaseVersion));
}

async function fetchFabricSupportedVersions() {
  const fabricData = await fetchJson<FabricGameVersion[]>('https://meta.fabricmc.net/v2/versions/game');
  return new Set((Array.isArray(fabricData) ? fabricData : []).filter((entry): entry is Required<Pick<FabricGameVersion, 'version'>> & FabricGameVersion => typeof entry?.version === 'string').map((entry) => entry.version));
}

export async function getServerVersionCatalog(): Promise<ServerVersionCatalog> {
  if (cachedCatalog && cachedCatalog.expiresAt > Date.now()) return cachedCatalog.value;

  const manifest = await fetchJson<MinecraftVersionManifest>('https://launchermeta.mojang.com/mc/game/version_manifest.json');
  const [paperSupportedVersions, fabricSupportedVersions] = await Promise.all([fetchPaperSupportedVersions(), fetchFabricSupportedVersions()]);

  const vanillaSupportedVersions = new Set(manifest.versions.map((version) => version.id));
  const catalog: ServerVersionCatalog = {
    [ServerSoftware.Vanilla]: asVersionOptions(manifest.versions, vanillaSupportedVersions, true),
    [ServerSoftware.Fabric]: asVersionOptions(manifest.versions, fabricSupportedVersions, true),
    [ServerSoftware.Paper]: asVersionOptions(manifest.versions, paperSupportedVersions, false)
  };

  cachedCatalog = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: catalog
  };

  return catalog;
}

export async function isSupportedServerVersion(serverSoftware: ServerSoftware, gameVersion: string) {
  const catalog = await getServerVersionCatalog();
  return catalog[serverSoftware]?.some((version) => version.id === gameVersion) ?? false;
}

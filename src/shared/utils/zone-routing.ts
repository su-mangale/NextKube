/**
 * Zone routing utilities for the YKP microfrontend architecture.
 *
 * In development, each zone runs on its own port:
 *   auth      → :3001
 *   dashboard → :3002  (covers /dashboard, /fleets, /clusters, /nodes, /workloads, /gitops, /observability, /settings)
 *   catalog   → :3003
 *   audit     → :3005
 *   idp       → :3006
 *   cloud-providers → :3007
 *
 * In production, an ingress/nginx routes by path prefix so relative URLs work.
 *
 * IMPORTANT: We intentionally avoid `window.location.hostname` here so that
 * server-side rendering and client-side rendering produce identical output,
 * preventing React hydration mismatches. We use `process.env.NODE_ENV` which
 * is a compile-time constant available on both server and client.
 */

export type Zone = 'dashboard' | 'catalog' | 'auth' | 'audit' | 'idp' | 'cloud-providers';

const DEV_PORTS: Record<Zone, number> = {
  auth: 3001,
  dashboard: 3002,
  catalog: 3003,
  audit: 3005,
  idp: 3006,
  'cloud-providers': 3007,
};

/** Returns the Zone that owns a given path. */
export function getZoneForPath(path: string): Zone {
  if (path.startsWith('/catalog')) return 'catalog';
  if (path.startsWith('/auth')) return 'auth';
  if (path.startsWith('/audit')) return 'audit';
  if (path.startsWith('/identity-providers')) return 'idp';
  if (path.startsWith('/providers') || path.startsWith('/cloud-providers')) return 'cloud-providers';
  return 'dashboard'; // /dashboard, /fleets, /clusters, /nodes, /workloads, /gitops, /observability, /settings
}

/**
 * Returns the full URL for a path.
 * - In development: prepends http://localhost:<port> so cross-zone links always
 *   land on the correct dev server regardless of which port we are currently on.
 * - In production: returns the path unchanged (handled by ingress routing).
 */
export function getZoneUrl(path: string): string {
  if (process.env.NODE_ENV !== 'development') return path;
  const zone = getZoneForPath(path);
  return `http://localhost:${DEV_PORTS[zone]}${path}`;
}

/**
 * Returns true when navigating to `targetPath` requires a full-page navigation
 * (i.e., the target is owned by a different zone than `currentZone`).
 */
export function isExternalRoute(targetPath: string, currentZone: Zone): boolean {
  return getZoneForPath(targetPath) !== currentZone;
}

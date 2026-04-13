/**
 * Conflict resolution: last-write-wins by version number.
 * If versions are equal — server wins.
 */
export function resolveConflict(local, server) {
    if (!local) return server;
    if (!server) return local;

    if (local.version > server.version) {
        return { ...server, ...local, isSynced: false };
    }

    return { ...local, ...server, isSynced: true };
}

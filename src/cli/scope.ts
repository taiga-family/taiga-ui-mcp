import {join} from 'node:path';

import {type ClientConfig, type UserPath} from './clients.js';

export type Scope = 'project' | 'user';

export interface ScopeEnv {
    readonly cwd: string;
    readonly home: string;
    readonly platform: NodeJS.Platform;
}

// Unlisted platforms (aix, freebsd, ...) fall back to the linux path.
function userRelativePath(userPath: UserPath, platform: NodeJS.Platform): string {
    if (typeof userPath === 'string') {
        return userPath;
    }

    const byPlatform: Partial<Record<NodeJS.Platform, string>> = {
        darwin: userPath.darwin,
        win32: userPath.win32,
        linux: userPath.linux,
    };

    return byPlatform[platform] ?? userPath.linux;
}

export function resolveConfigPath(
    client: ClientConfig,
    scope: Scope,
    env: ScopeEnv,
): string {
    return scope === 'user'
        ? join(env.home, userRelativePath(client.userPath, env.platform))
        : join(env.cwd, client.configPath);
}

export function displayPath(client: ClientConfig, scope: Scope, env: ScopeEnv): string {
    return scope === 'user'
        ? `~/${userRelativePath(client.userPath, env.platform)}`
        : client.configPath;
}

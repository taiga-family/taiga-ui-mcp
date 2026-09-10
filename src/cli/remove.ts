import {homedir} from 'node:os';

import {type JsonClientConfig, SERVER_NAME, type TomlClientConfig} from './clients.js';
import {readConfigFile, removeServerEntry, writeConfigFile} from './config-file.js';
import {
    fail,
    parseArgs,
    resolveClients,
    resolveScope,
    supportedClientsMessage,
} from './init.js';
import {displayPath, resolveConfigPath, type ScopeEnv} from './scope.js';
import {readTextFile, removeTomlTable, writeTextFile} from './toml-file.js';

export async function runRemove(argv: string[]): Promise<void> {
    const {clients: clientIds, scope: scopeOption} = parseArgs(argv);
    const resolved = await resolveClients(clientIds, 'Remove from which client(s)?');

    if (!resolved) {
        fail(
            `Missing --client option.\nSupported clients:\n${supportedClientsMessage()}\n`,
        );
    }

    if (resolved.unknown.length > 0) {
        fail(
            `Unknown client "${resolved.unknown.join('", "')}".\n` +
                `Supported clients:\n${supportedClientsMessage()}\n`,
        );
    }

    if (resolved.clients.length === 0) {
        fail(
            `Missing --client option.\nSupported clients:\n${supportedClientsMessage()}\n`,
        );
    }

    const scope = await resolveScope(scopeOption, 'Which scope to remove from?', [
        'project — this repo',
        'user — global for your machine',
    ]);

    const env: ScopeEnv = {
        cwd: process.cwd(),
        home: homedir(),
        platform: process.platform,
    };

    const lines: string[] = [];

    for (const client of resolved.clients) {
        const effectiveScope = client.userScopeOnly ? 'user' : scope;
        const filePath = resolveConfigPath(client, effectiveScope, env);
        const where = `${displayPath(client, effectiveScope, env)} (${client.label})`;

        const removed =
            client.kind === 'json'
                ? await removeFromJsonClient(client, filePath)
                : await removeFromTomlClient(client, filePath);

        lines.push(
            removed
                ? `Removed "${SERVER_NAME}" from ${where}.`
                : `No "${SERVER_NAME}" server in ${where}.`,
        );
    }

    process.stdout.write(`${lines.join('\n')}\n`);
}

async function removeFromJsonClient(
    client: JsonClientConfig,
    filePath: string,
): Promise<boolean> {
    const config = await readConfigFile(filePath);

    const {config: next, removed} = removeServerEntry(
        config,
        client.containerKey,
        SERVER_NAME,
    );

    if (removed) {
        await writeConfigFile(filePath, next);
    }

    return removed;
}

async function removeFromTomlClient(
    client: TomlClientConfig,
    filePath: string,
): Promise<boolean> {
    const existing = await readTextFile(filePath);
    const {content, removed} = removeTomlTable(existing, client.tableName);

    if (removed) {
        await writeTextFile(filePath, content);
    }

    return removed;
}

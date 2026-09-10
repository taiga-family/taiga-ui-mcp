import {homedir} from 'node:os';

import {
    type ClientConfig,
    CLIENTS,
    findClient,
    type JsonClientConfig,
    SERVER_NAME,
    type TomlClientConfig,
} from './clients.js';
import {mergeServerEntry, readConfigFile, writeConfigFile} from './config-file.js';
import {isInteractive, promptMultiSelect, promptSelect, promptText} from './prompt.js';
import {displayPath, resolveConfigPath, type Scope} from './scope.js';
import {readTextFile, upsertTomlTable, writeTextFile} from './toml-file.js';

const DOCS_ORIGIN = 'https://taiga-ui.dev';
const DEFAULT_VERSION = 'latest';

interface InitOptions {
    readonly clients: readonly string[];
    readonly version?: string;
    readonly sourceUrl?: string;
    readonly scope?: string;
}

export interface ResolvedClients {
    readonly clients: readonly ClientConfig[];
    readonly unknown: readonly string[];
}

function collectClients(target: string[], value: string | undefined): void {
    for (const id of value?.split(',') ?? []) {
        const trimmed = id.trim();

        if (trimmed) {
            target.push(trimmed);
        }
    }
}

export function parseArgs(argv: readonly string[]): InitOptions {
    const clients: string[] = [];
    let version: string | undefined;
    let sourceUrl: string | undefined;
    let scope: string | undefined;

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        if (arg === '--client') {
            collectClients(clients, argv[++index]);
        } else if (arg?.startsWith('--client=')) {
            collectClients(clients, arg.slice('--client='.length));
        } else if (arg === '--version') {
            version = argv[++index];
        } else if (arg?.startsWith('--version=')) {
            version = arg.slice('--version='.length);
        } else if (arg === '--source-url') {
            sourceUrl = argv[++index];
        } else if (arg?.startsWith('--source-url=')) {
            sourceUrl = arg.slice('--source-url='.length);
        } else if (arg === '--scope' || arg === '-s') {
            scope = argv[++index];
        } else if (arg?.startsWith('--scope=')) {
            scope = arg.slice('--scope='.length);
        }
    }

    return {clients, version, sourceUrl, scope};
}

// latest -> site root, next / vN -> a versioned docs path; unknown -> undefined.
export function resolveSourceUrl(version: string): string | undefined {
    if (version === 'latest') {
        return `${DOCS_ORIGIN}/llms-full.txt`;
    }

    return version === 'next' || /^v\d+$/.test(version)
        ? `${DOCS_ORIGIN}/${version}/llms-full.txt`
        : undefined;
}

export function supportedClientsMessage(): string {
    return CLIENTS.map((client) => `  - ${client.id} (${client.label})`).join('\n');
}

// Missing --client: pick from a menu in a terminal, otherwise leave undefined for the error path.
export async function resolveClients(
    ids: readonly string[],
): Promise<ResolvedClients | undefined> {
    if (ids.length > 0) {
        const clients: ClientConfig[] = [];
        const unknown: string[] = [];

        for (const id of ids) {
            const client = findClient(id);

            if (client) {
                clients.push(client);
            } else {
                unknown.push(id);
            }
        }

        return {clients, unknown};
    }

    if (!isInteractive()) {
        return undefined;
    }

    const indices = await promptMultiSelect(
        'Which MCP client(s)?',
        CLIENTS.map((client) => client.label),
    );

    return {
        clients: indices
            .map((index) => CLIENTS[index])
            .filter((client): client is ClientConfig => client !== undefined),
        unknown: [],
    };
}

// Missing --version (and no --source-url): ask in a terminal, otherwise default to latest.
async function resolveVersion(
    versionOption: string | undefined,
    sourceUrlOverride: string | undefined,
): Promise<string> {
    if (sourceUrlOverride) {
        return DEFAULT_VERSION;
    }

    if (versionOption) {
        return versionOption;
    }

    if (!isInteractive()) {
        return DEFAULT_VERSION;
    }

    const index = await promptSelect(
        'Docs version',
        [
            'latest (current stable)',
            'next (upcoming major)',
            'other (a previous major, e.g. v4)',
        ],
        0,
    );

    if (index === 0) {
        return 'latest';
    }

    return index === 1
        ? 'next'
        : (await promptText('Which major? (e.g. v4)')) || DEFAULT_VERSION;
}

// Missing --scope: ask in a terminal, otherwise default to project.
export async function resolveScope(scopeOption: string | undefined): Promise<Scope> {
    if (scopeOption !== undefined) {
        if (scopeOption === 'project' || scopeOption === 'user') {
            return scopeOption;
        }

        fail(`Unknown scope "${scopeOption}". Use "project" or "user".\n`);
    }

    if (!isInteractive()) {
        return 'project';
    }

    const index = await promptSelect(
        'Where should it live?',
        ['project — this repo (committable)', 'user — global for your machine'],
        0,
    );

    return index === 1 ? 'user' : 'project';
}

export function fail(message: string): never {
    process.stderr.write(message);
    process.exit(1);
}

export async function runInit(argv: string[]): Promise<void> {
    const {
        clients: clientIds,
        version: versionOption,
        sourceUrl: sourceUrlOverride,
        scope: scopeOption,
    } = parseArgs(argv);

    const resolved = await resolveClients(clientIds);

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

    const version = await resolveVersion(versionOption, sourceUrlOverride);
    const sourceUrl = sourceUrlOverride ?? resolveSourceUrl(version);

    if (!sourceUrl) {
        fail(
            `Unknown version "${version}". Use "latest", "next", or a major like "v4".\n`,
        );
    }

    const scope = await resolveScope(scopeOption);
    const env = {cwd: process.cwd(), home: homedir(), platform: process.platform};
    const summaries: string[] = [];
    const notes: string[] = [];

    for (const client of resolved.clients) {
        const effectiveScope = client.userScopeOnly ? 'user' : scope;
        const filePath = resolveConfigPath(client, effectiveScope, env);

        const existed =
            client.kind === 'json'
                ? await writeJsonClient(client, filePath, sourceUrl)
                : await writeTomlClient(client, filePath, sourceUrl);

        summaries.push(
            `${existed ? 'Updated' : 'Added'} "${SERVER_NAME}" MCP server in ${displayPath(client, effectiveScope, env)} (${client.label}).`,
        );

        if (client.userScopeOnly && scope === 'project') {
            notes.push(
                `${client.label} only has a global config, so it was written to ${displayPath(client, effectiveScope, env)} instead of the project.`,
            );
        }

        if (client.note !== undefined && effectiveScope === 'project') {
            notes.push(client.note);
        }
    }

    const restart =
        resolved.clients.length === 1 ? resolved.clients[0]?.label : 'your clients';

    const noteLines = [...new Set(notes)].map((note) => `Note: ${note}\n`).join('');

    process.stdout.write(
        `${summaries.join('\n')}\n` +
            `Source: ${sourceUrl}\n` +
            `Next: restart ${restart} to load the Taiga UI MCP server.\n${noteLines}`,
    );
}

async function writeJsonClient(
    client: JsonClientConfig,
    filePath: string,
    sourceUrl: string,
): Promise<boolean> {
    const config = await readConfigFile(filePath);
    const base = client.rootDefaults ? {...client.rootDefaults, ...config} : config;
    const entry = client.buildEntry(sourceUrl);

    const {merged, existed} = mergeServerEntry(
        base,
        client.containerKey,
        SERVER_NAME,
        entry,
    );

    await writeConfigFile(filePath, merged);

    return existed;
}

async function writeTomlClient(
    client: TomlClientConfig,
    filePath: string,
    sourceUrl: string,
): Promise<boolean> {
    const existing = await readTextFile(filePath);
    const entry = client.buildEntry(sourceUrl);
    const {content, existed} = upsertTomlTable(existing, client.tableName, entry);

    await writeTextFile(filePath, content);

    return existed;
}

import {resolve} from 'node:path';

import {
    type ClientConfig,
    CLIENTS,
    findClient,
    type JsonClientConfig,
    SERVER_NAME,
    type TomlClientConfig,
} from './clients.js';
import {mergeServerEntry, readConfigFile, writeConfigFile} from './config-file.js';
import {isInteractive, promptMenu, promptText} from './prompt.js';
import {readTextFile, upsertTomlTable, writeTextFile} from './toml-file.js';

const DOCS_ORIGIN = 'https://taiga-ui.dev';
const DEFAULT_VERSION = 'latest';

interface InitOptions {
    readonly client?: string;
    readonly version?: string;
    readonly sourceUrl?: string;
}

function parseArgs(argv: readonly string[]): InitOptions {
    let client: string | undefined;
    let version: string | undefined;
    let sourceUrl: string | undefined;

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        if (arg === '--client') {
            client = argv[++index];
        } else if (arg?.startsWith('--client=')) {
            client = arg.slice('--client='.length);
        } else if (arg === '--version') {
            version = argv[++index];
        } else if (arg?.startsWith('--version=')) {
            version = arg.slice('--version='.length);
        } else if (arg === '--source-url') {
            sourceUrl = argv[++index];
        } else if (arg?.startsWith('--source-url=')) {
            sourceUrl = arg.slice('--source-url='.length);
        }
    }

    return {client, version, sourceUrl};
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

function supportedClientsMessage(): string {
    return CLIENTS.map((client) => `  - ${client.id} (${client.label})`).join('\n');
}

// Missing --client: pick from a menu in a terminal, otherwise leave undefined for the error path.
async function resolveClient(clientId?: string): Promise<ClientConfig | undefined> {
    if (clientId) {
        return findClient(clientId);
    }

    if (!isInteractive()) {
        return undefined;
    }

    const index = await promptMenu(
        'Which MCP client?',
        CLIENTS.map((client) => client.label),
    );

    return CLIENTS[index];
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

    const index = await promptMenu(
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

export async function runInit(argv: string[]): Promise<void> {
    const {
        client: clientId,
        version: versionOption,
        sourceUrl: sourceUrlOverride,
    } = parseArgs(argv);

    const client = await resolveClient(clientId);

    if (!client) {
        const reason = clientId
            ? `Unknown client "${clientId}".`
            : 'Missing --client option.';

        process.stderr.write(
            `${reason}\nSupported clients:\n${supportedClientsMessage()}\n`,
        );
        process.exit(1);
    }

    const version = await resolveVersion(versionOption, sourceUrlOverride);
    const sourceUrl = sourceUrlOverride ?? resolveSourceUrl(version);

    if (!sourceUrl) {
        process.stderr.write(
            `Unknown version "${version}". Use "latest", "next", or a major like "v4".\n`,
        );
        process.exit(1);
    }

    const filePath = resolve(process.cwd(), client.configPath);

    const existed =
        client.kind === 'json'
            ? await writeJsonClient(client, filePath, sourceUrl)
            : await writeTomlClient(client, filePath, sourceUrl);

    const action = existed ? 'Updated' : 'Added';

    process.stdout.write(
        `${action} "${SERVER_NAME}" MCP server in ${client.configPath} (${client.label}).\n` +
            `Source: ${sourceUrl}\n` +
            `Next: restart ${client.label} to load the Taiga UI MCP server.\n`,
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

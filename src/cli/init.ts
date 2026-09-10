import {resolve} from 'node:path';

import {CLIENTS, findClient, SERVER_NAME} from './clients.js';
import {mergeServerEntry, readConfigFile, writeConfigFile} from './config-file.js';

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

export async function runInit(argv: string[]): Promise<void> {
    const {
        client: clientId,
        version: versionOption,
        sourceUrl: sourceUrlOverride,
    } = parseArgs(argv);

    const client = clientId ? findClient(clientId) : undefined;

    if (!client) {
        const reason = clientId
            ? `Unknown client "${clientId}".`
            : 'Missing --client option.';

        process.stderr.write(
            `${reason}\nSupported clients:\n${supportedClientsMessage()}\n`,
        );
        process.exit(1);
    }

    const version = versionOption ?? DEFAULT_VERSION;
    const sourceUrl = sourceUrlOverride ?? resolveSourceUrl(version);

    if (!sourceUrl) {
        process.stderr.write(
            `Unknown version "${version}". Use "latest", "next", or a major like "v4".\n`,
        );
        process.exit(1);
    }

    const filePath = resolve(process.cwd(), client.configPath);
    const config = await readConfigFile(filePath);
    const entry = client.buildEntry(sourceUrl);

    const {merged, existed} = mergeServerEntry(
        config,
        client.containerKey,
        SERVER_NAME,
        entry,
    );

    await writeConfigFile(filePath, merged);

    const action = existed ? 'Updated' : 'Added';

    process.stdout.write(
        `${action} "${SERVER_NAME}" MCP server in ${client.configPath} (${client.label}).\n` +
            `Source: ${sourceUrl}\n` +
            `Next: restart ${client.label} to load the Taiga UI MCP server.\n`,
    );
}

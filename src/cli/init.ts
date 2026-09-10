import {resolve} from 'node:path';

import {CLIENTS, findClient, SERVER_NAME} from './clients.js';
import {mergeServerEntry, readConfigFile, writeConfigFile} from './config-file.js';

const DEFAULT_SOURCE_URL = 'https://taiga-ui.dev/llms-full.txt';

interface InitOptions {
    readonly client?: string;
    readonly sourceUrl: string;
}

function parseArgs(argv: readonly string[]): InitOptions {
    let client: string | undefined;
    let sourceUrl = DEFAULT_SOURCE_URL;

    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];

        if (arg === '--client') {
            client = argv[++index];
        } else if (arg?.startsWith('--client=')) {
            client = arg.slice('--client='.length);
        } else if (arg === '--source-url') {
            sourceUrl = argv[++index] ?? sourceUrl;
        } else if (arg?.startsWith('--source-url=')) {
            sourceUrl = arg.slice('--source-url='.length);
        }
    }

    return {client, sourceUrl};
}

function supportedClientsMessage(): string {
    return CLIENTS.map((client) => `  - ${client.id} (${client.label})`).join('\n');
}

export async function runInit(argv: string[]): Promise<void> {
    const {client: clientId, sourceUrl} = parseArgs(argv);
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

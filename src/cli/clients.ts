export type JsonEntry = Record<string, unknown>;

export interface TomlEntry {
    readonly command: string;
    readonly args: readonly string[];
}

export interface JsonClientConfig {
    readonly kind: 'json';
    readonly id: string;
    readonly label: string;
    readonly configPath: string;
    readonly containerKey: string;
    readonly rootDefaults?: Record<string, unknown>;
    buildEntry(sourceUrl: string): JsonEntry;
}

export interface TomlClientConfig {
    readonly kind: 'toml';
    readonly id: string;
    readonly label: string;
    readonly configPath: string;
    readonly tableName: string;
    buildEntry(sourceUrl: string): TomlEntry;
}

export type ClientConfig = JsonClientConfig | TomlClientConfig;

export const SERVER_NAME = 'taiga-ui';

const OPENCODE_SCHEMA = 'https://opencode.ai/config.json';

function commandArgs(sourceUrl: string): readonly string[] {
    return ['-y', '@taiga-ui/mcp@latest', `--source-url=${sourceUrl}`];
}

function buildCommandEntry(sourceUrl: string): TomlEntry {
    return {
        command: 'npx',
        args: commandArgs(sourceUrl),
    };
}

function buildStandardEntry(sourceUrl: string): JsonEntry {
    return {...buildCommandEntry(sourceUrl)};
}

function buildStdioEntry(sourceUrl: string): JsonEntry {
    return {type: 'stdio', ...buildCommandEntry(sourceUrl)};
}

function buildOpencodeEntry(sourceUrl: string): JsonEntry {
    return {
        type: 'local',
        command: ['npx', ...commandArgs(sourceUrl)],
        enabled: true,
    };
}

export const CLIENTS: readonly ClientConfig[] = [
    {
        kind: 'json',
        id: 'claude',
        label: 'Claude Code',
        configPath: '.mcp.json',
        containerKey: 'mcpServers',
        buildEntry: buildStandardEntry,
    },
    {
        kind: 'json',
        id: 'cursor',
        label: 'Cursor',
        configPath: '.cursor/mcp.json',
        containerKey: 'mcpServers',
        buildEntry: buildStandardEntry,
    },
    {
        kind: 'json',
        id: 'vscode',
        label: 'VS Code',
        configPath: '.vscode/mcp.json',
        containerKey: 'servers',
        buildEntry: buildStdioEntry,
    },
    {
        kind: 'json',
        id: 'opencode',
        label: 'OpenCode',
        configPath: 'opencode.json',
        containerKey: 'mcp',
        rootDefaults: {$schema: OPENCODE_SCHEMA},
        buildEntry: buildOpencodeEntry,
    },
    {
        kind: 'toml',
        id: 'codex',
        label: 'Codex',
        configPath: '.codex/config.toml',
        tableName: 'mcp_servers.taiga-ui',
        buildEntry: buildCommandEntry,
    },
];

export function findClient(id: string): ClientConfig | undefined {
    return CLIENTS.find((client) => client.id === id);
}

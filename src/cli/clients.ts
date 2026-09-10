export type JsonEntry = Record<string, unknown>;

export interface TomlEntry {
    readonly command: string;
    readonly args: readonly string[];
}

export type UserPath =
    | string
    | {readonly darwin: string; readonly win32: string; readonly linux: string};

export interface JsonClientConfig {
    readonly kind: 'json';
    readonly id: string;
    readonly label: string;
    readonly configPath: string;
    readonly userPath: UserPath;
    readonly containerKey: string;
    readonly rootDefaults?: Record<string, unknown>;
    readonly note?: string;
    buildEntry(sourceUrl: string): JsonEntry;
}

export interface TomlClientConfig {
    readonly kind: 'toml';
    readonly id: string;
    readonly label: string;
    readonly configPath: string;
    readonly userPath: UserPath;
    readonly tableName: string;
    readonly note?: string;
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
        userPath: '.claude.json',
        containerKey: 'mcpServers',
        buildEntry: buildStandardEntry,
    },
    {
        kind: 'json',
        id: 'cursor',
        label: 'Cursor',
        configPath: '.cursor/mcp.json',
        userPath: '.cursor/mcp.json',
        containerKey: 'mcpServers',
        buildEntry: buildStandardEntry,
    },
    {
        kind: 'json',
        id: 'vscode',
        label: 'VS Code',
        configPath: '.vscode/mcp.json',
        userPath: {
            darwin: 'Library/Application Support/Code/User/mcp.json',
            win32: 'AppData/Roaming/Code/User/mcp.json',
            linux: '.config/Code/User/mcp.json',
        },
        containerKey: 'servers',
        buildEntry: buildStdioEntry,
    },
    {
        kind: 'json',
        id: 'opencode',
        label: 'OpenCode',
        configPath: 'opencode.json',
        userPath: '.config/opencode/opencode.json',
        containerKey: 'mcp',
        rootDefaults: {$schema: OPENCODE_SCHEMA},
        buildEntry: buildOpencodeEntry,
    },
    {
        kind: 'toml',
        id: 'codex',
        label: 'Codex',
        configPath: '.codex/config.toml',
        userPath: '.codex/config.toml',
        tableName: 'mcp_servers.taiga-ui',
        note: 'Codex reads a project .codex/config.toml only in a trusted workspace — trust this folder in Codex, or add the server to ~/.codex/config.toml instead.',
        buildEntry: buildCommandEntry,
    },
];

export function findClient(id: string): ClientConfig | undefined {
    return CLIENTS.find((client) => client.id === id);
}

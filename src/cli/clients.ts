export interface ServerEntry {
    readonly type?: string;
    readonly command: string;
    readonly args: readonly string[];
}

export interface ClientConfig {
    readonly id: string;
    readonly label: string;
    readonly configPath: string;
    readonly containerKey: string;
    buildEntry(sourceUrl: string): ServerEntry;
}

export const SERVER_NAME = 'taiga-ui';

function buildStandardEntry(sourceUrl: string): ServerEntry {
    return {
        command: 'npx',
        args: ['-y', '@taiga-ui/mcp@latest', `--source-url=${sourceUrl}`],
    };
}

function buildStdioEntry(sourceUrl: string): ServerEntry {
    return {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@taiga-ui/mcp@latest', `--source-url=${sourceUrl}`],
    };
}

export const CLIENTS: readonly ClientConfig[] = [
    {
        id: 'claude',
        label: 'Claude Code',
        configPath: '.mcp.json',
        containerKey: 'mcpServers',
        buildEntry: buildStandardEntry,
    },
    {
        id: 'cursor',
        label: 'Cursor',
        configPath: '.cursor/mcp.json',
        containerKey: 'mcpServers',
        buildEntry: buildStandardEntry,
    },
    {
        id: 'vscode',
        label: 'VS Code',
        configPath: '.vscode/mcp.json',
        containerKey: 'servers',
        buildEntry: buildStdioEntry,
    },
];

export function findClient(id: string): ClientConfig | undefined {
    return CLIENTS.find((client) => client.id === id);
}

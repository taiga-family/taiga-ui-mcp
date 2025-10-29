// In STDIO-based MCP servers can use only stderr for logging
// https://modelcontextprotocol.io/docs/develop/build-server#logging-in-mcp-servers

export function logError(message: string, err: unknown): void {
    const stack = err instanceof Error ? (err.stack ?? err.message) : String(err);

    console.error(`[ERROR] ${message}: ${stack}`);
}

export function logInfo(message: string): void {
    console.warn(`[INFO] ${message}`);
}

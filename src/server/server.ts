#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ensureSourceLoaded } from './fetch.js';
import { registerAllTools } from '../tools/index.js';
import { DocSection } from '../schemas/doc-types.js';

export interface IndexState {
    sections: DocSection[];
    sourceUrl?: string;
    cacheFilePath?: string;
    hash?: string;
    etag?: string;
}

export const state: IndexState = {
    sections: [],
    sourceUrl: undefined,
    cacheFilePath: undefined,
    hash: undefined,
    etag: undefined,
};

const server = new McpServer({
    name: 'taiga-ui-mcp',
    version: '1.0.0',
});

registerAllTools(server);

export async function start() {
    try {
        await ensureSourceLoaded();
    } catch (e) {
        console.error('Initial source load failed:', e);
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(
        `Angular Taiga UI MCP Server running. Fetched source components: ${state.sections.length}`
    );
}

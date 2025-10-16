#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ensureSourceLoaded } from './fetch.js';
import { registerAllTools } from '../tools/index.js';
import { DocSection } from '../schemas/doc-types.js';

export interface IndexState {
    sections: DocSection[];
    sourceUrl?: string;
    lastLoadedAt?: number;
}

export const state: IndexState = {
    sections: [],
    sourceUrl: undefined,
    lastLoadedAt: undefined,
};

const server = new McpServer({
    name: 'taiga-ui-mcp',
    version: '0.1.0-alpha.1',
});

registerAllTools(server);

export async function start() {
    try {
        await ensureSourceLoaded();
    } catch (error) {
        console.error('Initial source load failed:', error);
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(
        `Angular Taiga UI MCP Server running. Fetched source components: ${state.sections.length}`
    );
}

#!/usr/bin/env node
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';

import packageJson from '../../package.json' with {type: 'json'};
import {type DocSection} from '../schemas/doc-types.js';
import {registerAllTools} from '../tools/index.js';
import {logError, logInfo} from '../utils/logger.js';
import {ensureSourceLoaded} from './fetch.js';

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
    version: packageJson.version,
});

registerAllTools(server);

export async function start(): Promise<void> {
    try {
        await ensureSourceLoaded();
    } catch (error) {
        logError('Initial source load failed', error);
    }

    const transport = new StdioServerTransport();

    await server.connect(transport);

    logInfo(
        `Angular Taiga UI MCP Server running. Fetched source components: ${state.sections.length}`,
    );
}

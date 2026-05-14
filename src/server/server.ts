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
    overview?: string;
    migrationGuide?: string;
    sourceUrl?: string;
    lastLoadedAt?: number;
}

export const state: IndexState = {
    sections: [],
    overview: undefined,
    migrationGuide: undefined,
    sourceUrl: undefined,
    lastLoadedAt: undefined,
};

const server = new McpServer(
    {
        name: 'taiga-ui-mcp',
        version: packageJson.version,
    },
    {
        capabilities: {tools: {}},
        instructions: `
<General Purpose>
This server provides programmatic access to Taiga UI component documentation for AI assistants.
Use these tools to discover, understand, and retrieve usage examples for Taiga UI components.
</General Purpose>

<Core Workflows & Tool Guide>
* **1. Get Documentation Overview (Start Here):** Always begin by calling \`get_overview\` to retrieve the structured documentation header with installation instructions, critical notices, and general guidance.

* **2. Discover Components:** Call \`get_list_components\` to see all available Taiga UI components. Use the optional \`query\` parameter for fuzzy filtering to find specific components.

* **3. Get Component Examples:** Once you identify needed component(s), call \`get_component_example\` with component name(s) to retrieve full documentation and code examples.

* **4. Get Migration Guide:** Call \`get_migration_guide\` for step-by-step migration instructions, troubleshooting, and common issues when updating Taiga UI versions.
</Core Workflows & Tool Guide>

<Key Concepts>
* **Component Categories:** Components are organized by category (UI elements, forms, layouts, etc.)
* **Packages:** Components belong to different packages (CORE, KIT, etc.)
* **Fuzzy Matching:** Component queries support fuzzy matching for flexible searching.
</Key Concepts>
`,
    },
);

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

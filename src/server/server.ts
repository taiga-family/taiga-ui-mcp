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
    sourceUrl?: string;
    lastLoadedAt?: number;
}

export const DEFAULT_VERSION = 'v5';

export const versionedState = new Map<string, IndexState>();

export function getState(version = DEFAULT_VERSION): IndexState {
    let s = versionedState.get(version);

    if (!s) {
        s = {
            sections: [],
            overview: undefined,
            sourceUrl: undefined,
            lastLoadedAt: undefined,
        };
        versionedState.set(version, s);
    }

    return s;
}

/** @deprecated Use getState(version) instead. Kept for backward compatibility. */
export const state: IndexState = getState(DEFAULT_VERSION);

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
All tools support an optional \`version\` parameter ("v4" or "v5") to query specific Taiga UI versions. Defaults to "v5".
</General Purpose>

<Core Workflows & Tool Guide>
* **1. Get Documentation Overview (Start Here):** Always begin by calling \`get_overview\` to retrieve the structured documentation header with installation instructions, critical notices, and general guidance.

* **2. Discover Components:** Call \`get_list_components\` to see all available Taiga UI components. Use the optional \`query\` parameter for fuzzy filtering to find specific components.

* **3. Get Component Examples:** Once you identify needed component(s), call \`get_component_example\` with component name(s) to retrieve full documentation and code examples.

* **4. Migration v4 → v5:** Call \`get_migration_diff\` to compare components between v4 and v5. Returns API-level diffs (added/removed/modified inputs and outputs), package changes, and change flags. Use specific component names for targeted diffs, or omit names for a full overview. For detailed v4 documentation, use \`get_component_example\` with \`version: "v4"\`. Requires \`--v4-source-url\` to be configured.
</Core Workflows & Tool Guide>

<Key Concepts>
* **Component Categories:** Components are organized by category (UI elements, forms, layouts, etc.)
* **Packages:** Components belong to different packages (CORE, KIT, etc.)
* **Fuzzy Matching:** Component queries support fuzzy matching for flexible searching.
* **Multi-Version:** Documentation is available for v4 and v5 versions simultaneously when configured with \`--v4-source-url\`.
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
        `Angular Taiga UI MCP Server running. Fetched source components: ${getState().sections.length}`,
    );
}

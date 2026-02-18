import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

import {registerGetComponentExampleTool} from './get-component-example.js';
import {registerGetListComponentsTool} from './get-list-components.js';
import {registerGetOverviewTool} from './get-overview.js';

export function registerAllTools(server: McpServer): void {
    registerGetOverviewTool(server);
    registerGetListComponentsTool(server);
    registerGetComponentExampleTool(server);
}

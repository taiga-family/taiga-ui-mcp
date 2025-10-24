import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

import {registerGetComponentExampleTool} from './get-component-example.js';
import {registerGetListComponentsTool} from './get-list-components.js';

export function registerAllTools(server: McpServer): void {
    registerGetListComponentsTool(server);
    registerGetComponentExampleTool(server);
}

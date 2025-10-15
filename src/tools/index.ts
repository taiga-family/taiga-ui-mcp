import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGetListComponentsTool } from './get-list-components.js';
import { registerGetComponentExampleTool } from './get-component-example.js';

export function registerAllTools(server: McpServer) {
    registerGetListComponentsTool(server);
    registerGetComponentExampleTool(server);
}

import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {ensureSourceLoaded} from '../server/fetch.js';
import {getState} from '../server/server.js';
import {constructComponentsList} from '../utils/list-components.js';

export function registerGetListComponentsTool(server: McpServer): void {
    server.registerTool(
        'get_list_components',
        {
            title: 'List Components',
            description:
                'List all Taiga UI documentation section IDs (structured JSON only). Supports optional version parameter to query v4 or v5 documentation.',
            inputSchema: {
                query: z.string().optional().default(''),
                version: z
                    .enum(['v4', 'v5'])
                    .optional()
                    .default('v5')
                    .describe('Documentation version to query. Defaults to v5 (latest).'),
            },
            outputSchema: {
                items: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        category: z.string(),
                        package: z.string().nullable(),
                        type: z.string().nullable(),
                    }),
                ),
            },
        },
        async ({query, version}: {query?: string; version?: string}) => {
            const ver = version ?? 'v5';

            await ensureSourceLoaded(ver);

            const output = {
                items: constructComponentsList(query, getState(ver).sections),
            };

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(output, null, 2),
                    },
                ],
                structuredContent: output,
            };
        },
    );
}

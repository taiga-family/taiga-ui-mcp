import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {ensureSourceLoaded} from '../server/fetch.js';
import {constructComponentsList} from '../utils/list-components.js';

export function registerGetListComponentsTool(server: McpServer): void {
    server.registerTool(
        'get_list_components',
        {
            title: 'List Components',
            description:
                'List all Taiga UI documentation section IDs (structured JSON only).',
            inputSchema: {query: z.string().optional().default('')},
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
                total: z.number(),
                query: z.string().nullable(),
            },
        },
        async ({query}: {query?: string}) => {
            await ensureSourceLoaded();

            const {items, normalizedQuery} = constructComponentsList(query);

            const output = {
                items,
                total: items.length,
                query: normalizedQuery,
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

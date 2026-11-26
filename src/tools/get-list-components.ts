import {type McpServer} from '@modelcontextprotocol/server';
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
            inputSchema: z.object({query: z.string().optional().default('')}),
            outputSchema: z.object({
                items: z.array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        category: z.string(),
                        package: z.string().nullable(),
                        type: z.string().nullable(),
                        version: z.string().nullable(),
                    }),
                ),
            }),
        },
        async ({query}: {query?: string}) => {
            await ensureSourceLoaded();

            const output = {items: constructComponentsList(query)};

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

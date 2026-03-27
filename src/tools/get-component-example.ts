import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {ensureSourceLoaded} from '../server/fetch.js';
import {getState} from '../server/server.js';
import {buildQueryResults} from '../utils/query-results.js';

export function registerGetComponentExampleTool(server: McpServer): void {
    server.registerTool(
        'get_component_example',
        {
            title: 'Get Component Example',
            description:
                'Return section-related content snippets (formerly examples) for specified documentation section name(s). The presence of id indicates a successful match. Supports optional version parameter to query v4 or v5 documentation.',
            inputSchema: {
                names: z.array(z.string().min(2)).min(1),
                version: z
                    .enum(['v4', 'v5'])
                    .optional()
                    .default('v5')
                    .describe('Documentation version to query. Defaults to v5 (latest).'),
            },
            outputSchema: {
                results: z.array(
                    z.object({
                        query: z.string(),
                        id: z.string().optional(),
                        package: z.string().nullable().optional(),
                        type: z.string().nullable().optional(),
                        suggestions: z.array(z.string()).optional(),
                        content: z.array(z.string()).optional(),
                    }),
                ),
                matched: z.number(),
            },
        },
        async ({names, version}: {names: string[]; version?: string}) => {
            if (!names.length) {
                const output = {error: 'Provide at least one name in names array.'};

                return {
                    content: [{type: 'text', text: JSON.stringify(output, null, 2)}],
                    structuredContent: output,
                };
            }

            const ver = version ?? 'v5';

            await ensureSourceLoaded(ver);

            const {results, matches} = buildQueryResults(names, getState(ver).sections);
            const output = {results, matched: matches};

            return {
                content: [{type: 'text', text: JSON.stringify(output, null, 2)}],
                structuredContent: output,
            };
        },
    );
}

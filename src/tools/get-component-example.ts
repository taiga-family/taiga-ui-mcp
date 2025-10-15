import { z } from 'zod';
import { ensureSourceLoaded } from '../server/fetch.js';
import { buildQueryResults } from '../utils/query-results.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerGetComponentExampleTool(server: McpServer) {
    server.registerTool(
        'get_component_example',
        {
            title: 'Get Component Example',
            description:
                'Return example code snippets (structured JSON only) for specified documentation section name(s).',
            inputSchema: { names: z.array(z.string().min(2)).min(1) },
            outputSchema: {
                results: z.array(
                    z.object({
                        query: z.string(),
                        found: z.boolean(),
                        id: z.string().optional(),
                        package: z.string().nullable().optional(),
                        type: z.string().nullable().optional(),
                        suggestions: z.array(z.string()).optional(),
                        examples: z.array(z.string()).optional(),
                        examplesReturned: z.number().optional(),
                    })
                ),
                totalQueries: z.number(),
                matches: z.number(),
            },
        },
        async ({ names }: { names: string[] }) => {
            if (!names || !names.length) {
                const output = {
                    error: 'Provide at least one name in names array.',
                };

                return {
                    content: [
                        { type: 'text', text: JSON.stringify(output, null, 2) },
                    ],
                    structuredContent: output,
                };
            }

            await ensureSourceLoaded();

            const { results, matches } = buildQueryResults(names);

            const output = {
                results,
                totalQueries: names.length,
                matches,
            };

            return {
                content: [
                    { type: 'text', text: JSON.stringify(output, null, 2) },
                ],
                structuredContent: output,
            };
        }
    );
}

import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {ensureSourceLoaded} from '../server/fetch.js';
import {buildQueryResults} from '../utils/query-results.js';

export function registerGetComponentExampleTool(server: McpServer): void {
    server.registerTool(
        'get_component_example',
        {
            title: 'Get Component Example',
            description:
                'Return section-related content snippets (formerly examples) for specified documentation section name(s). The presence of id indicates a successful match.',
            inputSchema: {names: z.array(z.string().min(2)).min(1)},
            outputSchema: {
                results: z.array(
                    z.object({
                        query: z.string(),
                        id: z.string().optional(),
                        package: z.string().nullable().optional(),
                        type: z.string().nullable().optional(),
                        suggestions: z.array(z.string()).optional(),
                        content: z
                            .object({
                                description: z.string().nullable(),
                                mainExample: z
                                    .object({
                                        language: z.string(),
                                        code: z.string(),
                                    })
                                    .nullable(),
                                api: z
                                    .object({
                                        inputs: z
                                            .array(
                                                z.object({
                                                    property: z.string(),
                                                    type: z.string(),
                                                    description: z.string(),
                                                }),
                                            )
                                            .optional(),
                                        outputs: z
                                            .array(
                                                z.object({
                                                    property: z.string(),
                                                    type: z.string(),
                                                    description: z.string(),
                                                }),
                                            )
                                            .optional(),
                                    })
                                    .nullable(),
                                less: z.string().optional(),
                                pageTypescript: z.string().optional(),
                                examples: z.array(
                                    z.object({
                                        title: z.string(),
                                        template: z.string().optional(),
                                        typescript: z.string().optional(),
                                        styles: z.string().optional(),
                                    }),
                                ),
                            })
                            .optional(),
                    }),
                ),
                matched: z.number(),
            },
        },
        async ({names}: {names: string[]}) => {
            if (!names.length) {
                const output = {error: 'Provide at least one name in names array.'};

                return {
                    content: [{type: 'text', text: JSON.stringify(output, null, 2)}],
                    structuredContent: output,
                };
            }

            await ensureSourceLoaded();

            const {results, matches} = buildQueryResults(names);
            const output = {results, matched: matches};

            return {
                content: [{type: 'text', text: JSON.stringify(output, null, 2)}],
                structuredContent: output,
            };
        },
    );
}

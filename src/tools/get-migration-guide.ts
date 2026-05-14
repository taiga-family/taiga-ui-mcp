import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {ensureSourceLoaded} from '../server/fetch.js';
import {state} from '../server/server.js';
import {parseMigrationGuide} from '../utils/extract-migration-guide.js';

export function registerGetMigrationGuideTool(server: McpServer): void {
    server.registerTool(
        'get_migration_guide',
        {
            title: 'Get Migration Guide',
            description:
                'Returns the complete Migration Guide for Taiga UI updates. Includes step-by-step migration instructions, troubleshooting, and common issues. Call this tool when you need to migrate between Taiga UI versions.',
            inputSchema: z.object({}).optional(),
            outputSchema: {
                title: z.string(),
                introduction: z.array(z.string()),
                sections: z.array(
                    z.object({
                        title: z.string(),
                        content: z.array(z.string()),
                        codeBlocks: z.array(z.string()).optional(),
                        subsections: z
                            .array(
                                z.object({
                                    title: z.string(),
                                    content: z.array(z.string()),
                                    codeBlocks: z.array(z.string()).optional(),
                                }),
                            )
                            .optional(),
                    }),
                ),
            },
        },
        async () => {
            await ensureSourceLoaded();

            if (!state.migrationGuide?.trim()) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Migration Guide is not available. Ensure the source file contains the Migration Guide section.',
                        },
                    ],
                };
            }

            const parsed = parseMigrationGuide(state.migrationGuide);

            const output: Record<string, unknown> = {
                title: parsed.title,
                introduction: parsed.introduction,
                sections: parsed.sections.map((section) => {
                    const sectionData: Record<string, unknown> = {
                        title: section.title,
                        content: section.content,
                    };

                    if (section.codeBlocks && section.codeBlocks.length > 0) {
                        sectionData.codeBlocks = section.codeBlocks;
                    }

                    if (section.subsections && section.subsections.length > 0) {
                        sectionData.subsections = section.subsections.map((sub) => {
                            const subData: Record<string, unknown> = {
                                title: sub.title,
                                content: sub.content,
                            };

                            if (sub.codeBlocks && sub.codeBlocks.length > 0) {
                                subData.codeBlocks = sub.codeBlocks;
                            }

                            return subData;
                        });
                    }

                    return sectionData;
                }),
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

import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {ensureSourceLoaded} from '../server/fetch.js';
import {getState} from '../server/server.js';
import {
    type HeaderSection,
    parseHeaderSections,
    type Subsection,
} from '../utils/extract-header.js';

interface OverviewOutput {
    title: string;
    sections: Array<{
        title: string;
        description?: string;
        criticalNotices: string[];
        subsections: Array<{
            title: string;
            content: string[];
            sections?: Array<{section: string; code?: string}>;
            items?: Array<{
                title: string;
                content: string[];
                code?: string;
                sections?: Array<{section: string; code?: string}>;
            }>;
        }>;
    }>;
    totalComponents: number;
    sourceUrl?: string;
    [key: string]: unknown;
}

export function registerGetOverviewTool(server: McpServer): void {
    server.registerTool(
        'get_overview',
        {
            title: 'Get Documentation Overview',
            description:
                'Call this tool FIRST to retrieve the fully structured documentation header as JSON. Returns hierarchical sections with parsed content (no raw markdown). Includes installation instructions, critical notices, and subsections with their content and code blocks. This provides essential context before exploring specific components. Supports optional version parameter to query v4 or v5 documentation.',
            inputSchema: z
                .object({
                    version: z
                        .enum(['v4', 'v5'])
                        .optional()
                        .default('v5')
                        .describe(
                            'Documentation version to query. Defaults to v5 (latest).',
                        ),
                })
                .optional(),
            outputSchema: {
                title: z.string(),
                sections: z.array(
                    z.object({
                        title: z.string(),
                        description: z.string().optional(),
                        criticalNotices: z.array(z.string()),
                        subsections: z.array(
                            z.object({
                                title: z.string(),
                                content: z.array(z.string()),
                                sections: z
                                    .array(
                                        z.object({
                                            section: z.string(),
                                            code: z.string().optional(),
                                        }),
                                    )
                                    .optional(),
                                items: z
                                    .array(
                                        z.object({
                                            title: z.string(),
                                            content: z.array(z.string()),
                                            code: z.string().optional(),
                                            sections: z
                                                .array(
                                                    z.object({
                                                        section: z.string(),
                                                        code: z.string().optional(),
                                                    }),
                                                )
                                                .optional(),
                                        }),
                                    )
                                    .optional(),
                            }),
                        ),
                    }),
                ),
                totalComponents: z.number(),
                sourceUrl: z.string().optional(),
            },
        },
        async (args?: {version?: string}) => {
            const ver = args?.version ?? 'v5';

            await ensureSourceLoaded(ver);

            const s = getState(ver);

            const headerInfo = s.overview
                ? parseHeaderSections(s.overview)
                : {
                      title: 'Taiga UI Documentation',
                      sections: [],
                  };

            const output: OverviewOutput = {
                title: headerInfo.title,
                sections: headerInfo.sections.map((section: HeaderSection) => {
                    const sectionData: any = {title: section.title};

                    if (section.description) {
                        sectionData.description = section.description;
                    }

                    sectionData.criticalNotices = section.criticalNotices;
                    sectionData.subsections = section.subsections.map(
                        (sub: Subsection) => {
                            const subData: any = {
                                title: sub.title,
                                content: sub.content,
                            };

                            // Only include sections if not empty
                            if (sub.sections && sub.sections.length > 0) {
                                subData.sections = sub.sections;
                            }

                            // Only include items if not empty
                            if (sub.items && sub.items.length > 0) {
                                subData.items = sub.items.map((item: any) => {
                                    const itemData: any = {
                                        title: item.title,
                                        content: item.content,
                                    };

                                    if (item.code) {
                                        itemData.code = item.code;
                                    }

                                    if (item.sections && item.sections.length > 0) {
                                        itemData.sections = item.sections;
                                    }

                                    return itemData;
                                });
                            }

                            return subData;
                        },
                    );

                    return sectionData;
                }),
                totalComponents: s.sections.length,
                sourceUrl: s.sourceUrl,
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

import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {ensureSourceLoaded} from '../server/fetch.js';
import {state} from '../server/server.js';
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
                'Retrieve the fully structured documentation header as JSON. Returns hierarchical sections with parsed content (no raw markdown). Each section contains: title, description, critical notices, and subsections with their content and code blocks.',
            inputSchema: z.object({}).optional(),
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
        async () => {
            await ensureSourceLoaded();

            const headerInfo = state.overview
                ? parseHeaderSections(state.overview)
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
                totalComponents: state.sections.length,
                sourceUrl: state.sourceUrl,
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

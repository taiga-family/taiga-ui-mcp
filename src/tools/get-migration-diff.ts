import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {
    type ComponentChangeReason,
    type ComponentDiff,
    type MigrationDiff,
    type MigrationImpact,
    type RenameCandidate,
} from '../schemas/doc-types.js';
import {ensureSourceLoaded, getSourceUrl} from '../server/fetch.js';
import {getState} from '../server/server.js';
import {diffAllComponents, diffComponent} from '../utils/diff-components.js';
import {findSection} from '../utils/find-section.js';

type Scope = 'all' | 'components';

const VERSION_OLD = 'v4';
const VERSION_NEW = 'v5';
const DEFAULT_SCOPE: Scope = 'components';
const DEFAULT_INCLUDE_UNCHANGED = false;
const DEFAULT_INCLUDE_DOCS_ONLY = false;
const COMPONENTS_PREFIX = 'components/';
const V4_NOT_CONFIGURED_ERROR =
    'v4 source URL not configured. Pass --v4-source-url=... to enable migration diff.';

const MIGRATION_REASONS = new Set<ComponentChangeReason>([
    'api-inputs',
    'api-outputs',
    'package',
    'possible-rename',
]);

interface FullMigrationOutput {
    components: ComponentDiff[];
    renameCandidates: RenameCandidate[];
    summary: MigrationDiff['summary'];
}

interface CompactComponent {
    id: string;
    name: string;
    status: ComponentDiff['status'];
    docsOnly: boolean;
    migrationImpact: MigrationImpact;
    packageChange: ComponentDiff['packageChange'];
    apiDiff: ComponentDiff['apiDiff'];
    migrationReasons: Array<'api-inputs' | 'api-outputs' | 'package' | 'possible-rename'>;
    diffConfidence?: ComponentDiff['diffConfidence'];
}

interface CompactOutput {
    components: CompactComponent[];
    renameCandidates: RenameCandidate[];
    summary: {
        totals: {
            added: number;
            removed: number;
            modified: number;
            unchanged: number;
            potentiallyRenamed: number;
        };
        returned: {
            count: number;
            lowConfidence: number;
            docsOnly: number;
            unchanged: number;
        };
        hidden: {
            count: number;
            docsOnly: number;
            unchanged: number;
        };
    };
}

const renameCandidateSchema = z.object({
    fromId: z.string(),
    toId: z.string(),
    score: z.number(),
    reason: z.string(),
});

const apiPropertySchema = z.object({
    property: z.string(),
    type: z.string(),
    description: z.string(),
});

const apiPropertyChangeSchema = z.object({
    property: z.string(),
    from: z.object({type: z.string(), description: z.string()}),
    to: z.object({type: z.string(), description: z.string()}),
});

const apiDiffSchema = z.object({
    added: z.array(apiPropertySchema),
    removed: z.array(apiPropertySchema),
    modified: z.array(apiPropertyChangeSchema),
});

const componentDiffSchema = z.object({
    name: z.string(),
    id: z.string(),
    status: z.enum(['added', 'removed', 'modified', 'unchanged']),
    docsOnly: z.boolean(),
    packageChange: z.object({from: z.string(), to: z.string()}).nullable(),
    apiDiff: z.object({inputs: apiDiffSchema, outputs: apiDiffSchema}).nullable(),
    apiCoverage: z.object({
        oldHasParsedContent: z.boolean(),
        newHasParsedContent: z.boolean(),
        oldHasApiSection: z.boolean(),
        newHasApiSection: z.boolean(),
        oldApiProperties: z.number(),
        newApiProperties: z.number(),
    }),
    diffConfidence: z.enum(['high', 'medium', 'low']),
    migrationImpact: z.enum([
        'breaking',
        'likely-breaking',
        'non-breaking',
        'docs-only',
        'none',
        'unknown',
    ]),
    possibleRename: renameCandidateSchema.nullable(),
    changeReasons: z.array(
        z.enum([
            'api-inputs',
            'api-outputs',
            'docs-description',
            'docs-examples',
            'docs-less',
            'docs-main-example',
            'docs-typescript',
            'package',
            'possible-rename',
        ]),
    ),
    docsDiff: z.object({
        descriptionChanged: z.boolean(),
        mainExampleChanged: z.boolean(),
        pageTypescriptChanged: z.boolean(),
        lessChanged: z.boolean(),
        examplesChanged: z.boolean(),
    }),
    descriptionChanged: z.boolean(),
    pageTypescriptChanged: z.boolean(),
});

const compactComponentSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['added', 'removed', 'modified', 'unchanged']),
    docsOnly: z.boolean(),
    migrationImpact: z.enum([
        'breaking',
        'likely-breaking',
        'non-breaking',
        'docs-only',
        'none',
        'unknown',
    ]),
    packageChange: z.object({from: z.string(), to: z.string()}).nullable(),
    apiDiff: z.object({inputs: apiDiffSchema, outputs: apiDiffSchema}).nullable(),
    migrationReasons: z.array(
        z.enum(['api-inputs', 'api-outputs', 'package', 'possible-rename']),
    ),
    diffConfidence: z.enum(['high', 'medium', 'low']).optional(),
});

const fullSummarySchema = z.object({
    added: z.number(),
    removed: z.number(),
    modified: z.number(),
    unchanged: z.number(),
    docsChanged: z.number(),
    docsOnlyChanged: z.number(),
    potentiallyRenamed: z.number(),
    lowConfidence: z.number(),
    apiParseGaps: z.number(),
});

const compactSummarySchema = z.object({
    totals: z.object({
        added: z.number(),
        removed: z.number(),
        modified: z.number(),
        unchanged: z.number(),
        potentiallyRenamed: z.number(),
    }),
    returned: z.object({
        count: z.number(),
        lowConfidence: z.number(),
        docsOnly: z.number(),
        unchanged: z.number(),
    }),
    hidden: z.object({
        count: z.number(),
        docsOnly: z.number(),
        unchanged: z.number(),
    }),
});

function asStructuredContent(value: object): Record<string, unknown> {
    return value as unknown as Record<string, unknown>;
}

function assertV4Configured(): {error: string} | null {
    if (getSourceUrl(VERSION_OLD)) {
        return null;
    }

    return {error: V4_NOT_CONFIGURED_ERROR};
}

function filterSectionsByScope<T extends {id: string}>(
    items: readonly T[],
    scope: Scope,
): T[] {
    if (scope === 'all') {
        return [...items];
    }

    return items.filter((item) => item.id.startsWith(COMPONENTS_PREFIX));
}

function buildRenameCandidates(
    components: FullMigrationOutput['components'],
): FullMigrationOutput['renameCandidates'] {
    const seenRenameKeys = new Set<string>();

    return components
        .map((component) => component.possibleRename)
        .filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate)
        .filter((candidate) => {
            const key = `${candidate.fromId}->${candidate.toId}`;

            if (seenRenameKeys.has(key)) {
                return false;
            }

            seenRenameKeys.add(key);

            return true;
        });
}

function buildSummary(
    components: FullMigrationOutput['components'],
    renameCandidates: FullMigrationOutput['renameCandidates'],
): FullMigrationOutput['summary'] {
    return {
        added: components.filter((c) => c.status === 'added').length,
        removed: components.filter((c) => c.status === 'removed').length,
        modified: components.filter((c) => c.status === 'modified').length,
        unchanged: components.filter((c) => c.status === 'unchanged').length,
        docsChanged: components.filter((c) => Object.values(c.docsDiff).some(Boolean))
            .length,
        docsOnlyChanged: components.filter(
            (c) => c.status === 'unchanged' && Object.values(c.docsDiff).some(Boolean),
        ).length,
        potentiallyRenamed: renameCandidates.length,
        lowConfidence: components.filter((c) => c.diffConfidence === 'low').length,
        apiParseGaps: components.filter(
            (c) =>
                !c.apiCoverage.oldHasParsedContent || !c.apiCoverage.newHasParsedContent,
        ).length,
    };
}

async function buildFullOutput(args: {
    names?: string[];
    scope?: Scope;
}): Promise<FullMigrationOutput> {
    await Promise.all([ensureSourceLoaded(VERSION_OLD), ensureSourceLoaded(VERSION_NEW)]);

    const scope = args.scope ?? DEFAULT_SCOPE;
    const v4Sections = filterSectionsByScope(getState(VERSION_OLD).sections, scope);
    const v5Sections = filterSectionsByScope(getState(VERSION_NEW).sections, scope);

    if (args.names?.length) {
        const components = args.names
            .map((name) => {
                const v4Section = findSection(name, v4Sections);
                const v5Section = findSection(name, v5Sections);

                return diffComponent(v4Section, v5Section);
            })
            .filter((diff): diff is NonNullable<typeof diff> => diff !== null);

        const renameCandidates = buildRenameCandidates(components);
        const summary = buildSummary(components, renameCandidates);

        return {components, renameCandidates, summary};
    }

    return diffAllComponents(v4Sections, v5Sections);
}

function toCompactComponent(
    component: FullMigrationOutput['components'][number],
): CompactComponent {
    const migrationReasons = component.changeReasons.filter(
        (reason): reason is CompactComponent['migrationReasons'][number] =>
            MIGRATION_REASONS.has(reason),
    );

    return {
        id: component.id,
        name: component.name,
        status: component.status,
        docsOnly: component.docsOnly,
        migrationImpact: component.migrationImpact,
        packageChange: component.packageChange,
        apiDiff: component.apiDiff,
        migrationReasons,
        ...(component.diffConfidence !== 'high'
            ? {diffConfidence: component.diffConfidence}
            : {}),
    };
}

function toCompactOutput(
    fullOutput: FullMigrationOutput,
    options: {includeDocsOnly?: boolean; includeUnchanged?: boolean},
): CompactOutput {
    const includeUnchanged = options.includeUnchanged ?? DEFAULT_INCLUDE_UNCHANGED;
    const includeDocsOnly = options.includeDocsOnly ?? DEFAULT_INCLUDE_DOCS_ONLY;
    const filtered = fullOutput.components.filter((component) => {
        if (!includeDocsOnly && component.docsOnly) {
            return false;
        }

        if (
            !includeUnchanged &&
            component.status === 'unchanged' &&
            !component.docsOnly
        ) {
            return false;
        }

        return true;
    });

    const components = filtered.map(toCompactComponent);
    const returnedIds = new Set(components.map((component) => component.id));
    const hidden = fullOutput.components.length - components.length;
    const hiddenDocsOnly = fullOutput.components.filter(
        (component) => component.docsOnly && !returnedIds.has(component.id),
    ).length;
    const hiddenUnchanged = fullOutput.components.filter(
        (component) => component.status === 'unchanged' && !returnedIds.has(component.id),
    ).length;

    return {
        components,
        renameCandidates: fullOutput.renameCandidates,
        summary: {
            totals: {
                added: fullOutput.summary.added,
                removed: fullOutput.summary.removed,
                modified: fullOutput.summary.modified,
                unchanged: fullOutput.summary.unchanged,
                potentiallyRenamed: fullOutput.summary.potentiallyRenamed,
            },
            returned: {
                count: components.length,
                lowConfidence: components.filter(
                    (component) => component.diffConfidence === 'low',
                ).length,
                docsOnly: components.filter((component) => component.docsOnly).length,
                unchanged: components.filter(
                    (component) => component.status === 'unchanged',
                ).length,
            },
            hidden: {
                count: hidden,
                docsOnly: hiddenDocsOnly,
                unchanged: hiddenUnchanged,
            },
        },
    };
}

export function registerGetMigrationDiffTool(server: McpServer): void {
    server.registerTool(
        'get_migration_diff',
        {
            title: 'Get Migration Diff (v4 → v5)',
            description:
                'Compact migration-focused diff between Taiga UI v4 and v5. Returns only fields that are critical for code migration and hides unchanged/docs-only entries by default to save LLM context. Use get_migration_diff_full for full diagnostics.',
            inputSchema: {
                names: z
                    .array(z.string().min(2))
                    .optional()
                    .describe(
                        'Component names to compare. If omitted, compares all components.',
                    ),
                scope: z
                    .enum(['components', 'all'])
                    .optional()
                    .default(DEFAULT_SCOPE)
                    .describe(
                        'Limit comparison to components only, or include all sections.',
                    ),
                includeUnchanged: z
                    .boolean()
                    .optional()
                    .default(DEFAULT_INCLUDE_UNCHANGED)
                    .describe('Include unchanged entities in compact response.'),
                includeDocsOnly: z
                    .boolean()
                    .optional()
                    .default(DEFAULT_INCLUDE_DOCS_ONLY)
                    .describe('Include entities that changed only in docs/examples.'),
            },
            outputSchema: {
                components: z.array(compactComponentSchema),
                renameCandidates: z.array(renameCandidateSchema),
                summary: compactSummarySchema,
            },
        },
        async (args: {
            names?: string[];
            scope?: Scope;
            includeUnchanged?: boolean;
            includeDocsOnly?: boolean;
        }) => {
            const error = assertV4Configured();

            if (error) {
                return {
                    content: [{type: 'text', text: JSON.stringify(error, null, 2)}],
                    structuredContent: error,
                    isError: true,
                };
            }

            const fullOutput = await buildFullOutput(args);
            const output = toCompactOutput(fullOutput, {
                includeUnchanged: args.includeUnchanged,
                includeDocsOnly: args.includeDocsOnly,
            });

            return {
                content: [{type: 'text', text: JSON.stringify(output, null, 2)}],
                structuredContent: asStructuredContent(output),
            };
        },
    );
}

export function registerGetMigrationDiffFullTool(server: McpServer): void {
    server.registerTool(
        'get_migration_diff_full',
        {
            title: 'Get Migration Diff Full (v4 → v5)',
            description:
                'Full diagnostics migration diff between Taiga UI v4 and v5. Includes docs changes, confidence/coverage fields, and all analysis metadata. Use this when compact output is insufficient.',
            inputSchema: {
                names: z
                    .array(z.string().min(2))
                    .optional()
                    .describe(
                        'Component names to compare. If omitted, compares all components.',
                    ),
                scope: z
                    .enum(['components', 'all'])
                    .optional()
                    .default(DEFAULT_SCOPE)
                    .describe(
                        'Limit comparison to components only, or include all sections.',
                    ),
            },
            outputSchema: {
                components: z.array(componentDiffSchema),
                renameCandidates: z.array(renameCandidateSchema),
                summary: fullSummarySchema,
            },
        },
        async (args: {names?: string[]; scope?: Scope}) => {
            const error = assertV4Configured();

            if (error) {
                return {
                    content: [{type: 'text', text: JSON.stringify(error, null, 2)}],
                    structuredContent: error,
                    isError: true,
                };
            }

            const output = await buildFullOutput(args);

            return {
                content: [{type: 'text', text: JSON.stringify(output, null, 2)}],
                structuredContent: asStructuredContent(output),
            };
        },
    );
}

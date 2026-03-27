export interface ApiProperty {
    property: string;
    type: string;
    description: string;
}

export interface CodeBlock {
    language: string;
    code: string;
}

export interface ComponentExample {
    title: string;
    template?: string;
    typescript?: string;
    styles?: string;
}

export interface ComponentContent {
    description: string | null;
    mainExample: CodeBlock | null;
    api: {
        inputs?: ApiProperty[];
        outputs?: ApiProperty[];
    } | null;
    less?: string;
    pageTypescript?: string;
    examples: ComponentExample[];
}

export interface QueryResult {
    query: string;
    id?: string;
    package?: string | null;
    type?: string | null;
    suggestions?: string[];
    content?: ComponentContent;
}

export interface DocSection {
    id: string;
    title: string;
    content: string;
    package?: string;
    kind?: string;
    parsedContent?: ComponentContent;
}

export interface ApiPropertyChange {
    property: string;
    from: {type: string; description: string};
    to: {type: string; description: string};
}

export interface ApiDiff {
    added: ApiProperty[];
    removed: ApiProperty[];
    modified: ApiPropertyChange[];
}

export type ComponentDiffStatus = 'added' | 'modified' | 'removed' | 'unchanged';

export type ComponentChangeReason =
    | 'api-inputs'
    | 'api-outputs'
    | 'docs-description'
    | 'docs-examples'
    | 'docs-less'
    | 'docs-main-example'
    | 'docs-typescript'
    | 'package'
    | 'possible-rename';

export type DiffConfidence = 'high' | 'low' | 'medium';

export type MigrationImpact =
    | 'breaking'
    | 'docs-only'
    | 'likely-breaking'
    | 'non-breaking'
    | 'none'
    | 'unknown';

export interface ApiCoverage {
    oldHasParsedContent: boolean;
    newHasParsedContent: boolean;
    oldHasApiSection: boolean;
    newHasApiSection: boolean;
    oldApiProperties: number;
    newApiProperties: number;
}

export interface RenameCandidate {
    fromId: string;
    toId: string;
    score: number;
    reason: string;
}

export interface DocsDiff {
    descriptionChanged: boolean;
    mainExampleChanged: boolean;
    pageTypescriptChanged: boolean;
    lessChanged: boolean;
    examplesChanged: boolean;
}

export interface ComponentDiff {
    name: string;
    id: string;
    status: ComponentDiffStatus;
    docsOnly: boolean;
    packageChange: {from: string; to: string} | null;
    apiDiff: {inputs: ApiDiff; outputs: ApiDiff} | null;
    apiCoverage: ApiCoverage;
    diffConfidence: DiffConfidence;
    migrationImpact: MigrationImpact;
    possibleRename: RenameCandidate | null;
    changeReasons: ComponentChangeReason[];
    docsDiff: DocsDiff;
    descriptionChanged: boolean;
    pageTypescriptChanged: boolean;
}

export interface MigrationDiffSummary {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    docsChanged: number;
    docsOnlyChanged: number;
    potentiallyRenamed: number;
    lowConfidence: number;
    apiParseGaps: number;
}

export interface MigrationDiff {
    components: ComponentDiff[];
    renameCandidates: RenameCandidate[];
    summary: MigrationDiffSummary;
}

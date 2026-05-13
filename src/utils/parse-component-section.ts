import {
    type ApiProperty,
    type CodeBlock,
    type ComponentContent,
    type ComponentExample,
} from '../schemas/doc-types.js';

const HEADING_RE = /^(#{2,6})\s.+$/;
const CODE_FENCE_START_RE = /^```(\w*)$/;
const CODE_FENCE_END_RE = /^```$/;
const META_LINE_RE = /^-\s\*\*(?:Package|Type)\*\*/;
const COMPONENT_HEADING_RE = /^#\s\S/;
const TABLE_ROW_RE = /^\|.+\|$/;
const TABLE_SEPARATOR_RE = /^\|[-\s|]+\|$/;
const LABELED_BLOCK_RE = /^\*\*(.+?):\*\*$/;

const SKIPPED_SECTIONS = new Set<string>([]);
const API_HEADING_PREFIX = 'api';

function detectHeadingLevels(lines: readonly string[]): {
    sectionLevel: number;
    subsectionLevel: number;
} {
    const levels = new Set<number>();

    for (const line of lines) {
        const match = HEADING_RE.exec(line);

        if (match?.[1]) {
            levels.add(match[1].length);
        }
    }

    const sorted = [...levels].sort((a, b) => a - b);
    const sectionLevel = sorted[0] ?? 2;
    const subsectionLevel = sorted[1] ?? sectionLevel + 1;

    return {sectionLevel, subsectionLevel};
}

function buildHeadingRegex(level: number): RegExp {
    return new RegExp(String.raw`^${'#'.repeat(level)}\s(.+)$`);
}

function splitByHeadings(
    lines: readonly string[],
    headingRe: RegExp,
): Array<{heading: string; body: string[]}> {
    const blocks: Array<{heading: string; body: string[]}> = [];
    let currentHeading = '';
    let currentBody: string[] = [];

    for (const line of lines) {
        const match = headingRe.exec(line);

        if (match?.[1]) {
            blocks.push({heading: currentHeading, body: currentBody});
            currentHeading = match[1].trim();
            currentBody = [];
        } else {
            currentBody.push(line);
        }
    }

    blocks.push({heading: currentHeading, body: currentBody});

    return blocks;
}

function extractFirstCodeBlock(lines: readonly string[]): CodeBlock | null {
    let inBlock = false;
    let language = '';
    const code: string[] = [];

    for (const line of lines) {
        if (inBlock) {
            if (CODE_FENCE_END_RE.test(line)) {
                return {language: language || 'plaintext', code: code.join('\n')};
            }

            code.push(line);
        } else {
            const startMatch = CODE_FENCE_START_RE.exec(line);

            if (startMatch) {
                language = startMatch[1] ?? 'plaintext';
                inBlock = true;
            }
        }
    }

    return null;
}

function extractLabeledCodeBlocks(lines: readonly string[]): Record<string, string> {
    const result: Record<string, string> = {};
    let pendingLabel: string | null = null;
    let inBlock = false;
    let blockCode: string[] = [];

    for (const line of lines) {
        if (inBlock) {
            if (CODE_FENCE_END_RE.test(line)) {
                if (pendingLabel) {
                    result[pendingLabel] = blockCode.join('\n');
                    pendingLabel = null;
                }

                blockCode = [];
                inBlock = false;
            } else {
                blockCode.push(line);
            }

            continue;
        }

        const labelMatch = LABELED_BLOCK_RE.exec(line);

        if (labelMatch?.[1]) {
            pendingLabel = labelMatch[1].trim().toLowerCase();
            continue;
        }

        if (CODE_FENCE_START_RE.test(line)) {
            inBlock = true;
            blockCode = [];
        }
    }

    return result;
}

function extractDescription(preambleLines: readonly string[]): string | null {
    const meaningful = preambleLines.filter(
        (line) =>
            line.trim() !== '' &&
            !COMPONENT_HEADING_RE.test(line) &&
            !META_LINE_RE.test(line) &&
            !/^-{3,}\s*$/.test(line),
    );

    return meaningful.length > 0 ? meaningful.join('\n').trim() : null;
}

function splitMarkdownTableRow(line: string): string[] {
    const cells: string[] = [];
    let currentCell = '';
    let inInlineCode = false;

    const normalized = line.trim().replace(/^\|/, '').replace(/\|$/, '');

    for (const character of normalized) {
        if (character === '`') {
            inInlineCode = !inInlineCode;
            currentCell += character;
            continue;
        }

        if (character === '|' && !inInlineCode) {
            cells.push(currentCell.trim());
            currentCell = '';
            continue;
        }

        currentCell += character;
    }

    cells.push(currentCell.trim());

    return cells;
}

function parseApiTable(lines: readonly string[]): ApiProperty[] {
    const properties: ApiProperty[] = [];
    let headerParsed = false;

    for (const line of lines) {
        if (!TABLE_ROW_RE.test(line)) {
            continue;
        }

        if (TABLE_SEPARATOR_RE.test(line)) {
            continue;
        }

        const cells = splitMarkdownTableRow(line);

        if (!headerParsed) {
            headerParsed = true;
            continue;
        }

        const [property, type, ...descriptionParts] = cells;
        const description = descriptionParts.join(' | ');

        if (property && type) {
            properties.push({
                property: property.trim(),
                type: type.replaceAll('`', '').trim(),
                description: description.trim(),
            });
        }
    }

    return properties;
}

function buildApiFromBlocks(
    blocks: ReadonlyArray<{heading: string; body: string[]}>,
): ComponentContent['api'] {
    let inputs: ApiProperty[] | undefined;
    let outputs: ApiProperty[] | undefined;

    for (const block of blocks) {
        const headingLower = block.heading.toLowerCase();

        if (!headingLower.startsWith(API_HEADING_PREFIX)) {
            continue;
        }

        const props = parseApiTable(block.body);

        if (props.length === 0) {
            continue;
        }

        if (headingLower.includes('output')) {
            outputs = props;
        } else {
            inputs = props;
        }
    }

    return inputs || outputs ? {inputs, outputs} : null;
}

function parseUsageExamples(
    bodyLines: readonly string[],
    subsectionRe: RegExp,
): ComponentExample[] {
    const subBlocks = splitByHeadings(bodyLines, subsectionRe);
    const examples: ComponentExample[] = [];

    for (const {heading, body} of subBlocks) {
        if (!heading) {
            continue;
        }

        const labeled = extractLabeledCodeBlocks(body);
        const example: ComponentExample = {title: heading};

        if (labeled['template']) {
            example.template = labeled['template'];
        }

        if (labeled['typescript']) {
            example.typescript = labeled['typescript'];
        }

        if (labeled['styles']) {
            example.styles = labeled['styles'];
        }

        if (!example.template && !example.typescript) {
            const singleBlock = extractFirstCodeBlock(body);

            if (singleBlock) {
                if (
                    singleBlock.language === 'ts' ||
                    singleBlock.language === 'typescript'
                ) {
                    example.typescript = singleBlock.code;
                } else {
                    example.template = singleBlock.code;
                }
            }
        }

        if (example.template || example.typescript || example.styles) {
            examples.push(example);
        }
    }

    return examples;
}

function isSkippedSection(heading: string): boolean {
    return SKIPPED_SECTIONS.has(heading.toLowerCase());
}

export function parseComponentSection(raw: string): ComponentContent {
    const lines = raw.split(/\r?\n/);
    const {sectionLevel, subsectionLevel} = detectHeadingLevels(lines);
    const sectionRe = buildHeadingRegex(sectionLevel);
    const subsectionRe = buildHeadingRegex(subsectionLevel);
    const sectionBlocks = splitByHeadings(lines, sectionRe);

    const preamble = sectionBlocks[0];
    const description = preamble ? extractDescription(preamble.body) : null;

    let mainExample: CodeBlock | null = null;
    let usageExamples: ComponentExample[] = [];
    let less: string | undefined;
    let pageTypescript: string | undefined;

    for (const block of sectionBlocks) {
        if (!block.heading || isSkippedSection(block.heading)) {
            continue;
        }

        const headingLower = block.heading.toLowerCase();

        if (headingLower === 'example') {
            mainExample = extractFirstCodeBlock(block.body);
        } else if (headingLower === 'usage examples') {
            usageExamples = parseUsageExamples(block.body, subsectionRe);
        } else if (headingLower === 'typescript') {
            const codeBlock = extractFirstCodeBlock(block.body);

            if (codeBlock?.code.trim()) {
                pageTypescript = codeBlock.code;
            } else {
                const rawTs = block.body.join('\n').trim();

                if (rawTs) {
                    pageTypescript = rawTs;
                }
            }
        } else if (headingLower === 'less') {
            const codeBlock = extractFirstCodeBlock(block.body);

            if (codeBlock?.code.trim()) {
                less = codeBlock.code;
            } else {
                const rawStyles = block.body.join('\n').trim();

                if (rawStyles) {
                    less = rawStyles;
                }
            }
        }
    }

    const api = buildApiFromBlocks(sectionBlocks);

    return {
        description,
        mainExample,
        api,
        ...(less ? {less} : {}),
        ...(pageTypescript ? {pageTypescript} : {}),
        examples: usageExamples,
    };
}

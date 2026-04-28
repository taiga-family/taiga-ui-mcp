import {type DocSection} from '../schemas/doc-types.js';
import {state} from '../server/server.js';
import {extractHeaderContent, findComponentsSectionStart} from './extract-header.js';
import {extractMigrationGuideContent} from './extract-migration-guide.js';

function extractMeta(text: string): {package?: string; kind?: string} {
    let pkg: string | undefined;
    let kind: string | undefined;

    const pkgMatch = /\*\*Package\*\*:\s*`([^`]+)`/i.exec(text);

    if (pkgMatch?.[1]) {
        pkg = pkgMatch[1];
    }

    const typeMatch = /\*\*Type\*\*:\s*([^\n]+)/i.exec(text);

    if (typeMatch?.[1]) {
        kind = typeMatch[1].trim();
    }

    return {package: pkg, kind};
}

export function parseContent(rawContent: string, sourceUrl: string): void {
    if (!rawContent.trim()) {
        throw new Error('parseContent: rawContent is empty');
    }

    state.sourceUrl = sourceUrl;

    const headerContent = extractHeaderContent(rawContent);

    state.overview = headerContent;

    const migrationGuideContent = extractMigrationGuideContent(rawContent);

    state.migrationGuide = migrationGuideContent;

    const lines = rawContent.split(/\r?\n/);
    const componentsStartLine = findComponentsSectionStart(rawContent);

    const headerIndices: Array<{line: number; title: string}> = [];

    for (let lineIndex = componentsStartLine; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        if (line === undefined) {
            continue;
        }

        const isH1 = /^#\s+/.test(line);
        const headerMatch = /^#\s+(components\/\S.*)$/.exec(line);

        if (lineIndex > componentsStartLine && isH1 && !headerMatch) {
            break;
        }

        if (headerMatch?.[1]) {
            headerIndices.push({
                line: lineIndex,
                title: headerMatch[1].trim(),
            });
        }
    }

    state.sections = headerIndices.map((header, headerIndex): DocSection => {
        const start = header.line;
        const end = headerIndices[headerIndex + 1]?.line ?? lines.length;
        const content = lines.slice(start, end).join('\n');
        const meta = extractMeta(content);

        return {
            id: header.title,
            title: header.title,
            content,
            package: meta.package,
            kind: meta.kind,
        };
    });
}

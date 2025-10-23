import type {DocSection} from '../schemas/doc-types.js';
import {state} from '../server/server.js';

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
    state.sourceUrl = sourceUrl;

    const lines = rawContent.split(/\r?\n/);
    const headerIndices: Array<{line: number; title: string}> = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];

        if (line === undefined) {
            continue;
        }

        const headerMatch = /^#\s+(.+)$/.exec(line);

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
